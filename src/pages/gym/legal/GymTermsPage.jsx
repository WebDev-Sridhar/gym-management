import GymLegalPage from '../../../components/gym/GymLegalPage'
import { getGymTermsContent } from '../../../lib/content/gym-legal/terms'

export default function GymTermsPage() {
  return <GymLegalPage getContent={getGymTermsContent} pageKey="terms" />
}
