import GymLegalPage from '../../../components/gym/GymLegalPage'
import { getGymPrivacyContent } from '../../../lib/content/gym-legal/privacy'

export default function GymPrivacyPage() {
  return <GymLegalPage getContent={getGymPrivacyContent} pageKey="privacy" />
}
