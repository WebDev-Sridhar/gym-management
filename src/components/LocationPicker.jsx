import { useState, useRef, useCallback } from 'react'
import { useJsApiLoader, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api'

// Must be a stable reference outside the component — prevents infinite reload
const LIBRARIES = ['places']

const MAP_CONTAINER_STYLE = { width: '100%', height: '340px' }
const DEFAULT_CENTER      = { lat: 13.0827, lng: 80.2707 } // Chennai
const DEFAULT_ZOOM        = 13

const MAP_OPTIONS = {
  streetViewControl:   false,
  mapTypeControl:      false,
  fullscreenControl:   false,
  zoomControlOptions:  { position: 9 }, // RIGHT_CENTER
  styles: [
    { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit',      stylers: [{ visibility: 'off' }] },
  ],
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LocationPicker({ value, onChange }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  })

  const [position,   setPosition]   = useState(
    value?.lat && value?.lng ? { lat: value.lat, lng: value.lng } : null
  )
  const [placeName,  setPlaceName]  = useState(value?.placeName || '')
  const [inputValue, setInputValue] = useState(value?.placeName || '')

  const mapRef    = useRef(null)
  const acRef     = useRef(null)  // Autocomplete instance

  const onMapLoad = useCallback(map => { mapRef.current = map }, [])
  const onAcLoad  = useCallback(ac  => { acRef.current  = ac  }, [])

  // Called when user selects a place from the autocomplete dropdown
  function onPlaceChanged() {
    const ac = acRef.current
    if (!ac) return
    const place = ac.getPlace()
    if (!place?.geometry?.location) return

    const lat  = place.geometry.location.lat()
    const lng  = place.geometry.location.lng()
    const name = place.formatted_address || place.name || ''

    setPosition({ lat, lng })
    setPlaceName(name)
    setInputValue(name)
    mapRef.current?.panTo({ lat, lng })
    mapRef.current?.setZoom(16)
    onChange?.({ lat, lng, placeName: name })
  }

  // Click anywhere on map → move pin (no reverse geocode — keep existing place name)
  function onMapClick(e) {
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    setPosition({ lat, lng })
    onChange?.({ lat, lng, placeName })
  }

  // Drag pin to adjust
  function onMarkerDragEnd(e) {
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    setPosition({ lat, lng })
    onChange?.({ lat, lng, placeName })
  }

  function clearPin() {
    setPosition(null)
    setPlaceName('')
    setInputValue('')
    onChange?.({ lat: null, lng: null, placeName: '' })
  }

  // ── Render states ────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Failed to load Google Maps. Check your API key in <code className="font-mono text-xs">.env</code>.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-col gap-3">
        {/* Search skeleton */}
        <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
        {/* Map skeleton */}
        <div className="rounded-xl bg-gray-100 animate-pulse flex items-center justify-center" style={{ height: 340 }}>
          <svg className="w-8 h-8 text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Search / Autocomplete ── */}
      <Autocomplete
        onLoad={onAcLoad}
        onPlaceChanged={onPlaceChanged}
        options={{ fields: ['formatted_address', 'geometry', 'name'] }}
      >
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl
          focus-within:border-gray-400 focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.05)] transition-all duration-150">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Search for your gym's location…"
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent min-w-0"
            autoComplete="off"
          />
          {inputValue && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setInputValue('') }}
              className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </Autocomplete>

      {/* ── Map ── */}
      <div className="rounded-xl overflow-hidden border border-gray-200" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={position || DEFAULT_CENTER}
          zoom={position ? 16 : DEFAULT_ZOOM}
          options={MAP_OPTIONS}
          onLoad={onMapLoad}
          onClick={onMapClick}
        >
          {position && (
            <Marker
              position={position}
              draggable
              onDragEnd={onMarkerDragEnd}
              animation={window.google?.maps?.Animation?.DROP}
            />
          )}
        </GoogleMap>
      </div>

      {/* ── Status strip ── */}
      {position ? (
        <div className="flex items-stretch gap-0 rounded-xl overflow-hidden border border-gray-200 bg-white divide-x divide-gray-200">
          {/* Place name */}
          {placeName && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 flex-1 min-w-0">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="text-xs text-gray-600 truncate">{placeName}</span>
            </div>
          )}

          {/* Clear button */}
          <button
            type="button"
            onClick={clearPin}
            className="px-3.5 py-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
            title="Remove pin"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center">
          Search for a place or click the map to drop a pin
        </p>
      )}
    </div>
  )
}
