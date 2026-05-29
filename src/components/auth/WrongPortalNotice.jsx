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
// Find-my-gym lookup form was removed: the screen already shows the user
// their gym name + portal URL (they signed in successfully — we KNOW who
// they are), so an email-it-to-me affordance was strictly redundant. The
// underlying /functions/v1/find-my-gym edge function stays deployed for
// future use (e.g., a public "Find my gym" page that doesn't require a
// successful sign-in), but nothing in the app currently calls it.
export default function WrongPortalNotice({ gym, onSignOut }) {
  const portalHref = `/${gym.slug}/login`

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
    </div>
  )
}
