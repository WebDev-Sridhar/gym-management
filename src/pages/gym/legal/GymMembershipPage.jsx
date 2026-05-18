import GymLegalPage from '../../../components/gym/GymLegalPage'
import { getGymMembershipContent } from '../../../lib/content/gym-legal/membership'

export default function GymMembershipPage() {
  return <GymLegalPage getContent={getGymMembershipContent} pageKey="membership" />
}
