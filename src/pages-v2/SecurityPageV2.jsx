import V2PageShell from '../components-v2/layout/V2PageShell'
import PageHero from '../components-v2/ui/PageHero'
import LegalContent from '../components-v2/sections/LegalContent'
import { usePageTracking } from '../lib/hooks/usePageTracking'
import { SECURITY_CONTENT } from '../lib/content/legal/security'
import { mapSecurityData } from '../lib/mappers/legalMapper'
import { ROUTES } from '../lib/constants/routes'

export default function SecurityPageV2() {
  usePageTracking('security_v2')
  const data = mapSecurityData(SECURITY_CONTENT)

  return (
    <V2PageShell seo={{ ...data.seo, canonical: ROUTES.V2.SECURITY }}>
      <PageHero title={data.title} />
      <LegalContent intro={data.intro} meta={data.meta} sections={data.sections} />
    </V2PageShell>
  )
}
