const UNS = 'https://images.unsplash.com/photo-'
const fit = '?w=800&q=80&auto=format&fit=crop'
const fitWide = '?w=1920&q=80&auto=format&fit=crop'



export function getDefaultContent(gymName = 'Our Gym', gymCity = '') {
  const city = gymCity ? ` in ${gymCity}` : ''
  return {
    hero: {
      badge: 'Now Enrolling',
      title: 'FORGE YOUR\nSTRONGEST SELF',
      subtitle: 'Premium equipment. Expert coaching. A community that pushes you further than you thought possible.',
      primaryCTA: { label: 'View Plans', path: 'pricing' },
      secondaryCTA: { label: 'Meet Our Trainers', path: 'trainers' },
      // backgroundImage: `${UNS}1534438327276-14e5300c3a48${fitWide}`,
      backgroundImage: `${UNS}1728486145245-d4cb0c9c3470${fitWide}`,
      imageDescription: "Train harder. Get stronger. Stay consistent",
    },
    stats: [
      { value: '500+', label: 'Active Members' },
      { value: '15+', label: 'Expert Trainers' },
      { value: '50+', label: 'Weekly Classes' },
      { value: '10+', label: 'Years of Excellence' },
    ],
    about: {
      superLabel: 'Our Story',
      heading: `This Is ${gymName}`,
      description: `${gymName}${city} was built for people who refuse to settle. Whether you're just starting out or chasing a personal record, our facility gives you every tool you need — world-class equipment, certified coaches, and a training environment that demands your best.`,
      image: `${UNS}1571019614242-c5c5dee9f50b${fit}`,
      features: [
        { icon: 'dumbbell', text: 'State-of-the-art equipment updated yearly' },
        { icon: 'award',    text: 'Certified personal trainers on-floor daily' },
        { icon: 'target',   text: '50+ group classes every week' },
        { icon: 'users',    text: 'Nutrition & recovery programs included' },
      ],
    },
    workoutPrograms: [
      {
        id: 'wp-1',
        category: 'STRENGTH',
        title: 'Iron Weight Training',
        description: 'Build raw power and lean muscle',
        image: `${UNS}1581009146145-b5ef050c2e1e${fit}`,
      },
      {
        id: 'wp-2',
        category: 'HIIT',
        title: 'High Intensity Circuit',
        description: 'Maximum burn in minimum time',
        image: `${UNS}1599058917212-d750089bc07e${fit}`,
      },
      {
        id: 'wp-3',
        category: 'YOGA',
        title: 'Power Yoga Flow',
        description: 'Strength through mindful movement',
        image: `${UNS}1544367567-0f2fcb009e0b${fit}`,
      },
      {
        id: 'wp-4',
        category: 'BOXING',
        title: 'Combat Fitness',
        description: 'Hit harder, move faster',
        image: `${UNS}1549719386-74dfcbf7dbed${fit}`,
      },
      {
        id: 'wp-5',
        category: 'CROSSFIT',
        title: 'CrossFit WOD',
        description: 'Push every limit every day',
        image: `${UNS}1526401485004-46910ecc8e51${fit}`,
      },
      {
        id: 'wp-6',
        category: 'CARDIO',
        title: 'Speed Endurance',
        description: 'Run further, breathe easier',
        image: `${UNS}1538805060514-97d9cc17730c${fit}`,
      },
    ],
    programs: {
      heading: 'Our Programs',
      subtitle: 'Choose the plan that matches your fitness ambitions',
      fallbackPlans: [
        {
          id: 'default-1',
          name: 'Starter',
          price: 999,
          duration_label: 'per month',
          features: ['Full gym access', 'Locker facility', 'Fitness assessment', 'Group classes (3/week)'],
          is_popular: false,
        },
        {
          id: 'default-2',
          name: 'Pro',
          price: 1999,
          duration_label: 'per month',
          features: ['Everything in Starter', '4 PT sessions/month', 'Nutrition plan', 'Unlimited group classes', 'Progress tracking'],
          is_popular: true,
        },
        {
          id: 'default-3',
          name: 'Elite',
          price: 3499,
          duration_label: 'per month',
          features: ['Everything in Pro', 'Unlimited PT sessions', 'Spa & recovery access', 'Priority booking', 'Guest passes'],
          is_popular: false,
        },
      ],
    },
    trainers: {
      heading: 'MEET THE COACHES',
      subtitle: 'World-class experts. Real results. Built for you.',
      fallbackTrainers: [
        { id: 'dt-1', name: 'Alex Rivera', specialization: 'Strength & Conditioning', bio: 'NSCA-certified with 8+ years transforming athletes and beginners into their strongest selves.', image_url: `${UNS}1701481080490-cb2e7f4fd5f8${fit}` },
        { id: 'dt-2', name: 'Priya Sharma', specialization: 'Yoga & Mobility', bio: 'RYT-500 certified. Builds flexibility, balance, and mental clarity through power yoga.', image_url: `${UNS}1689897229406-0f600543bb8d${fit}` },
        { id: 'dt-3', name: 'Marcus Chen', specialization: 'HIIT & Cardio', bio: 'Explosive workouts, real results. Marcus has trained over 200+ athletes to peak fitness.', image_url: `${UNS}1665851299249-2106aa4d725c${fit}` },
      ],
    },
    testimonials: {
      heading: 'REAL PEOPLE.\nREAL RESULTS.',
      subtitle: 'Stories from members who changed everything',
      fallbackTestimonials: [
        { id: 'ft-1', name: 'Rahul M.', role: 'Member since 2022', message: `Joining ${gymName} was the best decision I made. The trainers genuinely care about your progress. I lost 18kg in 6 months.`, rating: 5 },
        { id: 'ft-2', name: 'Sneha K.', role: 'Pro Member', message: 'Nothing compares to this place. The community keeps you accountable and the results speak for themselves. Life-changing.', rating: 5 },
        { id: 'ft-3', name: 'Arjun P.', role: 'Elite Member', message: "World-class equipment, expert trainers, and an atmosphere that pushes you to do more every single day. Five stars isn't enough.", rating: 5 },
        { id: 'ft-4', name: 'Divya R.', role: 'Starter Member', message: `I was nervous joining a gym for the first time, but ${gymName} made me feel at home from day one. Down 12kg and absolutely loving it.`, rating: 5 },
        { id: 'ft-5', name: 'Karan S.', role: 'Pro Member', message: 'The HIIT classes here are absolutely brutal — in the best way possible. My endurance has skyrocketed in just three months.', rating: 5 },
        { id: 'ft-6', name: 'Meera T.', role: 'Elite Member', message: 'Best investment I ever made in myself. The personal trainers design programs that actually fit your lifestyle and goals. Incredible team.', rating: 5 },
      ],
    },
    gallery: [
      { id: 'g-1', src: `${UNS}1534438327276-14e5300c3a48${fit}`, alt: 'Gym floor' },
      { id: 'g-2', src: `${UNS}1571019614242-c5c5dee9f50b${fit}`, alt: 'CrossFit' },
      { id: 'g-3', src: `${UNS}1581009146145-b5ef050c2e1e${fit}`, alt: 'Strength training' },
      { id: 'g-4', src: `${UNS}1599058917212-d750089bc07e${fit}`, alt: 'Cardio' },
      { id: 'g-5', src: `${UNS}1549719386-74dfcbf7dbed${fit}`, alt: 'Boxing' },
      { id: 'g-6', src: `${UNS}1526401485004-46910ecc8e51${fit}`, alt: 'CrossFit equipment' },
    ],
    cta: {
      preHeading: 'READY TO TRANSFORM?',
      heading: 'ARE YOU IN?',
      subtitle: `Join ${gymName} today. Stop waiting. Start building the body you want.`,
      buttonLabel: 'Get Started Now',
      buttonPath: 'pricing',
    },
  }
}
