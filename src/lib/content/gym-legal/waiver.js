import { resolveGymFields, buildMeta, GYM_LEGAL_DEFAULTS } from './_shared'

export function getGymWaiverContent(gym) {
  const g = resolveGymFields(gym)

  return {
    seo: {
      title: `Health & Liability Waiver · ${g.name}`,
      description: `Assumption of risk, medical clearance, and liability disclaimer for members of ${g.name}.`,
      canonical: g.slug ? `/${g.slug}/waiver` : '',
    },
    meta: buildMeta(g),
    title: 'Health & Liability Waiver',
    intro: `This Health & Liability Waiver ("Waiver") is an important part of your membership at ${g.name} ("the gym", "we", "us"). It describes the inherent risks of exercise and the health-related responsibilities you accept when training with us. Please read it carefully. By signing up for a membership, entering the facility, or participating in any class, training session, or activity, you confirm that you have read, understood, and accepted this Waiver.`,
    sections: [
      {
        id: 'assumption-of-risk',
        heading: '1. Assumption of risk',
        body: 'You understand that physical exercise carries an inherent risk of injury, illness, or in rare cases, serious harm. Risks include but are not limited to: muscle strains and tears, joint or ligament injury, cardiovascular events, dehydration, falls, dropped weights, and equipment-related accidents. By participating in training at the facility, you voluntarily assume all such risks, whether foreseen or unforeseen.',
      },
      {
        id: 'medical-clearance',
        heading: '2. Medical clearance',
        body: 'You are strongly encouraged to consult a qualified medical practitioner before beginning any new exercise programme, particularly if you have any of the following: cardiovascular disease, high blood pressure, diabetes, asthma or respiratory conditions, joint or back problems, pregnancy or recent childbirth, recent surgery, or any condition that may affect safe exercise. We may, at our discretion, require a medical clearance certificate before permitting high-intensity training.',
      },
      {
        id: 'health-disclosure',
        heading: '3. Health disclosure',
        body: 'You agree to disclose to the gym, at the time of joining and during your membership, any: (a) pre-existing or current medical conditions; (b) injuries, surgeries, or physical limitations; (c) pregnancy or postpartum status; (d) medications that affect heart rate, balance, or blood pressure; (e) allergies relevant to first aid. You agree to update this information promptly if it changes. Failure to disclose relevant health information limits our ability to keep you safe and may release us from related liability.',
      },
      {
        id: 'instructions',
        heading: '4. Following instructions',
        body: 'You agree to follow the instructions of qualified trainers and staff, use equipment within your demonstrated capacity, warm up and cool down appropriately, and stop training immediately if you feel pain, dizziness, chest discomfort, shortness of breath, or any other concerning symptom. You agree to inform a trainer or staff member without delay if any such symptom arises.',
      },
      {
        id: 'children-and-minors',
        heading: '5. Minors and supervision',
        body: 'For members aged 16–17, a parent or legal guardian must co-sign this Waiver and accept its terms on the minor\'s behalf. The minor must train under the supervision of a parent, guardian, or designated trainer at all times.',
      },
      {
        id: 'no-medical-advice',
        heading: '6. No medical advice',
        body: 'Our trainers are qualified to design and supervise exercise and nutrition programmes within their scope of practice. They are not medical practitioners, and nothing they say or write constitutes medical, diagnostic, or therapeutic advice. For any medical concern, please consult a registered doctor or other qualified health professional.',
      },
      {
        id: 'emergency-care',
        heading: '7. Emergency care',
        body: 'In a medical emergency on the premises, staff will provide basic first aid and contact emergency medical services and your registered emergency contact. You authorise the gym to take reasonable steps to obtain medical care for you in the event you are unable to do so yourself.',
      },
      {
        id: 'release-and-indemnity',
        heading: '8. Release and indemnity',
        body: `To the maximum extent permitted by ${GYM_LEGAL_DEFAULTS.governingLaw}, you release and discharge the gym, its owners, employees, contractors, and trainers from any and all claims, demands, or actions for injury, illness, loss, or damage arising out of or in connection with your use of the facility, equipment, or services, except where such injury, illness, loss, or damage is caused by gross negligence or wilful misconduct on the part of the gym or its staff. You agree to indemnify the gym against any third-party claim arising from your own conduct on the premises.`,
      },
      {
        id: 'personal-property',
        heading: '9. Personal property',
        body: 'The gym is not responsible for loss, theft, or damage to personal property brought to the premises, including in lockers, common areas, or the parking area. Please leave valuables at home or carry them with you.',
      },
      {
        id: 'photo-consent',
        heading: '10. Photo and video consent (optional)',
        body: 'From time to time, the gym may photograph or record videos for use in social media, marketing, or training material. You will be asked for explicit consent before any image or footage featuring you is published. You may withdraw consent at any time, and we will remove or stop using the relevant content as soon as practicable.',
      },
      {
        id: 'severability',
        heading: '11. Severability',
        body: 'If any provision of this Waiver is held unenforceable, the remaining provisions will continue in full force and effect.',
      },
      {
        id: 'governing-law',
        heading: '12. Governing law',
        body: `This Waiver is governed by the ${GYM_LEGAL_DEFAULTS.governingLaw}. Any dispute will be subject to the exclusive jurisdiction of ${g.courts}.`,
      },
      {
        id: 'contact',
        heading: '13. Questions',
        body: `If anything in this Waiver is unclear, please raise it before signing up, or ${g.contactLine}.`,
      },
    ],
  }
}
