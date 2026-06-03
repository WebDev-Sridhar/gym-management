// V3 CMS rebuild: Solo Coach single-page website CMS.
//
// Renders StarterWebsitePage with variant='solo' — the same panels +
// data layer, but with a filtered section list (theme / hero / about /
// programs / plans / reviews / contact) tailored to a one-page
// scrolling site. The upgrade banner inside the editor nudges to
// Starter (multi-page) instead of Pro.
//
// Why a wrapper instead of a separate file: the panels (HeroForm,
// AboutPanel, ProgramsPanel, etc.) are non-trivial. Duplicating ~1500
// lines would invite drift. The variant pattern keeps both flows on a
// single source of truth — change a panel once, both CMSes get it.

import StarterWebsitePage from './StarterWebsitePage'

export default function SoloCoachWebsitePage() {
  return <StarterWebsitePage variant="solo" />
}
