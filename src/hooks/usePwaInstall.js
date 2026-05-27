/**
 * usePwaInstall — captures Chrome's beforeinstallprompt event so the app
 * can show its own install button instead of relying on Chrome's mini-infobar.
 *
 * Why this exists:
 *   Chrome's automatic mini-infobar has a ~3-month cooldown after the first
 *   prompt/dismissal. Capturing the event and calling .prompt() ourselves
 *   bypasses the cooldown and gives us full control over timing.
 *
 * Returns:
 *   canInstall   — true when the browser is ready to install (event captured)
 *   install()    — triggers the native install dialog
 *   isInstalled  — true once the app is added to the home screen
 */

import { useState, useEffect } from 'react'

export function usePwaInstall() {
  const [promptEvent, setPromptEvent]   = useState(null)
  const [isInstalled, setIsInstalled]   = useState(false)

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    function onBeforeInstall(e) {
      e.preventDefault()          // stop Chrome's automatic mini-infobar
      setPromptEvent(e)           // save so we can trigger it ourselves
    }

    function onAppInstalled() {
      setIsInstalled(true)
      setPromptEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  async function install() {
    if (!promptEvent) return
    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setPromptEvent(null)
  }

  return {
    canInstall: !!promptEvent && !isInstalled,
    isInstalled,
    install,
  }
}
