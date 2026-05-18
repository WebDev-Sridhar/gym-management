import GymLegalPage from '../../../components/gym/GymLegalPage'
import { getGymRefundContent } from '../../../lib/content/gym-legal/refund'

export default function GymRefundPage() {
  return <GymLegalPage getContent={getGymRefundContent} pageKey="refund" />
}
