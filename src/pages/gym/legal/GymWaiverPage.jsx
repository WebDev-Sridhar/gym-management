import GymLegalPage from '../../../components/gym/GymLegalPage'
import { getGymWaiverContent } from '../../../lib/content/gym-legal/waiver'

export default function GymWaiverPage() {
  return <GymLegalPage getContent={getGymWaiverContent} pageKey="waiver" />
}
