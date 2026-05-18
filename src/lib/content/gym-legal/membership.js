import { resolveGymFields, buildMeta } from './_shared'

export function getGymMembershipContent(gym) {
  const g = resolveGymFields(gym)

  return {
    seo: {
      title: `Membership Agreement · ${g.name}`,
      description: `House rules, code of conduct, and member responsibilities at ${g.name}.`,
      canonical: g.slug ? `/${g.slug}/membership` : '',
    },
    meta: buildMeta(g),
    title: 'Membership Agreement',
    intro: `This Membership Agreement describes the day-to-day rules of using ${g.name} ("the gym", "we", "us"). These rules exist so every member can train safely, comfortably, and without interruption. By signing up, you agree to follow them.`,
    sections: [
      {
        id: 'check-in',
        heading: '1. Check-in and identification',
        body: 'Every entry into the facility must be logged using your assigned QR code, membership card, or biometric credential. Tailgating, lending your credentials, or signing in on behalf of another person is not permitted. Reception staff may request photo identification at any time.',
      },
      {
        id: 'dress-code',
        heading: '2. Dress code and hygiene',
        body: 'Members must wear appropriate athletic clothing and closed-toe sports shoes inside the training floor. Jeans, sandals, slippers, work boots, and shirtless training are not permitted. Please carry a small towel during your workout and wipe down equipment after use. Personal hygiene is expected in shared spaces, including changing rooms and showers.',
      },
      {
        id: 'equipment-use',
        heading: '3. Equipment use',
        body: 'Use equipment only for its intended purpose and within your capacity. Free weights, plates, and accessories must be returned to their racks after use. Do not drop weights, except in designated platforms or where rubber flooring permits. Report damaged or malfunctioning equipment to staff immediately and do not attempt to repair it yourself.',
      },
      {
        id: 'reservations',
        heading: '4. Class bookings and machine fairness',
        body: 'Classes and bookable sessions must be reserved in advance through the member app or reception. Repeated no-shows may result in temporary booking restrictions. During peak hours, please share popular machines and limit cardio equipment to the posted time slot if other members are waiting.',
      },
      {
        id: 'external-trainers',
        heading: '5. Personal training and external coaches',
        body: 'Paid coaching, instruction, or supervision inside the facility may be conducted only by trainers employed or authorised by the gym. Members are welcome to train with a friend, but engaging external trainers for paid sessions on the premises is not permitted and may result in termination.',
      },
      {
        id: 'lockers',
        heading: '6. Lockers and personal property',
        body: 'Lockers, where available, are for short-term use during your training session only. Lockers must be vacated before you leave the premises; items left overnight may be cleared by staff and stored at lost-and-found for up to 30 days. The gym is not responsible for any loss, theft, or damage to personal property anywhere on the premises.',
      },
      {
        id: 'conduct',
        heading: '7. Code of conduct',
        body: 'We have zero tolerance for harassment, discrimination, intimidation, aggressive behaviour, intoxication, or any conduct that disturbs the safety or training of other members. The use of recreational drugs, performance-enhancing drugs, alcohol, or tobacco on the premises is strictly prohibited. Breach of this rule is grounds for immediate termination without refund.',
      },
      {
        id: 'photography',
        heading: '8. Photography and social media',
        body: 'You may record short videos of your own training, provided that other members and staff are not visible in the frame without their consent. Filming in changing rooms, showers, or toilets is strictly prohibited and is grounds for immediate termination and, where applicable, criminal reporting. Tagging or naming other members on social media without consent is not permitted.',
      },
      {
        id: 'guests',
        heading: '9. Guests and trials',
        body: 'Members are welcome to refer friends for a trial session, subject to advance reception approval and any applicable guest fee. Guests must sign a one-time waiver before training and remain accompanied by the host member during their visit.',
      },
      {
        id: 'minors',
        heading: '10. Minors and supervision',
        body: 'Members aged 16–17 must train under the supervision of a parent, guardian, or a designated gym trainer. Children below 16 are not permitted on the training floor for safety reasons, except during designated kids\' programmes where applicable.',
      },
      {
        id: 'health-safety',
        heading: '11. Health, safety, and emergencies',
        body: 'Inform a trainer or staff member immediately if you feel unwell, dizzy, or experience pain during training. In a medical emergency, staff will provide first aid and call for medical assistance using the emergency contact you have provided. Please keep your emergency contact and any relevant medical information up to date.',
      },
      {
        id: 'cleanliness',
        heading: '12. Cleanliness',
        body: 'Please dispose of water bottles, wrappers, and used tissues in the bins provided. Spilled water, sweat, or chalk should be wiped up to keep the floor safe for the next member.',
      },
      {
        id: 'cctv',
        heading: '13. CCTV',
        body: 'CCTV is operated in common training areas, entrances, and reception for member and staff safety. Cameras are not installed in changing rooms, showers, or toilets. Footage is retained and accessed strictly in accordance with our Privacy Policy.',
      },
      {
        id: 'consequences',
        heading: '14. Breach of this Agreement',
        body: 'Breach of this Agreement may result in a verbal warning, a written warning, suspension of access, or termination of membership, depending on severity and any previous breaches. Termination for cause does not entitle you to a refund.',
      },
      {
        id: 'updates',
        heading: '15. Updates to this Agreement',
        body: 'We may update this Agreement to reflect changes in operations or safety practice. Material changes will be communicated at the facility and through WhatsApp, email, or in-app notifications.',
      },
      {
        id: 'contact',
        heading: '16. Questions',
        body: `Have a question about a specific rule? Speak to a manager at reception, or ${g.contactLine}.`,
      },
    ],
  }
}
