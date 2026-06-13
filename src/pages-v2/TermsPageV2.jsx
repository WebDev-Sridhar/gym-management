import V2PageShell from '../components-v2/layout/V2PageShell'
import PageHero from '../components-v2/ui/PageHero'
import LegalContent from '../components-v2/sections/LegalContent'
import { usePageTracking } from '../lib/hooks/usePageTracking'
import { TERMS_CONTENT } from '../lib/content/legal/terms'
import { mapTermsData } from '../lib/mappers/legalMapper'
import { ROUTES } from '../lib/constants/routes'

export default function TermsPageV2() {
  usePageTracking('terms_v2')
  const data = mapTermsData(TERMS_CONTENT)

  return (
    <V2PageShell seo={{ ...data.seo, canonical: ROUTES.V2.TERMS }}>
      <PageHero title={data.title} />
      <LegalContent intro={data.intro} meta={data.meta} sections={data.sections} />
    </V2PageShell>
  )
}
