import V2PageShell from '../components-v2/layout/V2PageShell'
import PageHero from '../components-v2/ui/PageHero'
import LegalContent from '../components-v2/sections/LegalContent'
import { usePageTracking } from '../lib/hooks/usePageTracking'
import { PRIVACY_CONTENT } from '../lib/content/legal/privacy'
import { mapPrivacyData } from '../lib/mappers/legalMapper'
import { ROUTES } from '../lib/constants/routes'

export default function PrivacyPageV2() {
  usePageTracking('privacy_v2')
  const data = mapPrivacyData(PRIVACY_CONTENT)

  return (
    <V2PageShell seo={{ ...data.seo, canonical: ROUTES.V2.PRIVACY }}>
      <PageHero title={data.title} />
      <LegalContent intro={data.intro} meta={data.meta} sections={data.sections} />
    </V2PageShell>
  )
}
