import { useState } from 'react'

// Phase 5 hard-split UX. Replaces the Phase 4 PortalRedirectNotice (a soft
// nudge that still continued to /member-app). After Phase 5, the SaaS surface
// rejects non-owner sign-ins: the user gets pointed at their gym's branded
// portal and signed out, and has to sign in again at the correct URL.
//
// Why hard-reject? Members bookmarking gymmobius.com/login was the symptom
// of a deeper problem — they never had a reason to use their gym's branded
// portal. Soft-redirecting them taught the URL but kept the bad bookmark
// working. Hard reject forces the bookmark fix today instead of indefinitely.
//
// Props:
//   - gym ({ name, slug, logo_url? }) — resolved from the user's profile
//   - onSignOut(): optional callback after the user clicks the deep link;
//     LoginPage uses this to clear local state. Sign-out itself is handled
//     by the caller BEFORE rendering this component.
//
// Find-my-gym affordance: collapsed by default, expands into an email lookup
// form. The /functions/v1/find-my-gym edge function (Phase 5) silently emails
// the user their gym URL if the address matches a member/trainer row. Anti-
// enumeration: always renders "If {email} is registered, we've sent the link"
// regardless of whether a match was found.
export default function WrongPortalNotice({ gym, onSignOut }) {
  const [showLookup, setShowLookup] = useState(false)
  const [lookupEmail, setLookupEmail] = useState('')
  const [lookupBusy, setLookupBusy] = useState(false)
  const [lookupMsg, setLookupMsg] = useState('')
  const [lookupErr, setLookupErr] = useState('')

  const portalHref = `/${gym.slug}/login`

  async function handleLookup(e) {
    e.preventDefault()
    const email = lookupEmail.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLookupErr('Enter a valid email address')
      return
    }
    setLookupBusy(true); setLookupErr(''); setLookupMsg('')
    try {
      const { supabase } = await import('../../services/supabaseClient')
      const { error } = await supabase.functions.invoke('find-my-gym', {
        body: { email },
      })
      if (error) throw error
      // Anti-enumeration: identical message regardless of match.
      setLookupMsg(`If ${email} is registered with a gym on Gymmobius, we've emailed you the link.`)
      setLookupEmail('')
    } catch (err) {
      setLookupErr(err.message || 'Could not look up your gym. Try again later.')
    } finally {
      setLookupBusy(false)
    }
  }

  return (
    <div className="text-center space-y-5">
      <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-amber-200">
        <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Wrong portal</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          You're a member of <span className="font-semibold text-gray-900">{gym.name}</span>.
          The Gymmobius main site is for gym owners — please sign in at your gym's branded portal.
        </p>
      </div>

      <a
        href={portalHref}
        onClick={() => { if (onSignOut) onSignOut() }}
        className="block w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-violet-200 hover:shadow-violet-300 transition-all text-center"
      >
        Sign in at {gym.name}
      </a>

      <p className="text-xs text-gray-400">
        Bookmark this URL:{' '}
        <a href={portalHref} className="font-medium text-violet-700 underline underline-offset-2">
          gymmobius.com{portalHref}
        </a>
      </p>

      <div className="pt-4 border-t border-gray-100">
        {!showLookup ? (
          <button
            type="button"
            onClick={() => setShowLookup(true)}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            Don't know your gym? Look it up by email →
          </button>
        ) : (
          <form onSubmit={handleLookup} className="text-left space-y-3">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              placeholder="your@email.com"
              autoFocus
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={lookupBusy}
                className="flex-1 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-black transition-colors disabled:opacity-50"
              >
                {lookupBusy ? 'Sending…' : 'Send my gym link'}
              </button>
              <button
                type="button"
                onClick={() => { setShowLookup(false); setLookupErr(''); setLookupMsg('') }}
                className="px-3 py-2 text-xs text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
            {lookupErr && (
              <p className="text-xs text-red-600">{lookupErr}</p>
            )}
            {lookupMsg && (
              <p className="text-xs text-emerald-600">{lookupMsg}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
