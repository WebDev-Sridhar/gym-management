export function getDefaultContent(gymName = 'Our Gym', gymCity = '') {
  return {
    hero: {
      title: `Transform Your Body. Elevate Your Life.`,
      subtitle: `Premium training programs, expert coaches, and a community built for results — all at ${gymName}.`,
      badge: 'Now Open',
      primaryCTA: { label: 'View Plans', path: 'pricing' },
      secondaryCTA: { label: 'Learn More', path: 'about' },
    },
    about: {
      heading: `Why ${gymName}?`,
      description: `At ${gymName}, we believe fitness is more than a workout — it's a lifestyle. Our state-of-the-art facility${gymCity ? ` in ${gymCity}` : ''} is designed to help you push boundaries, build confidence, and achieve results that last. From world-class equipment to expert-led programs, everything is built around your success.`,
      stats: [
        { value: '500+', label: 'Active Members' },
        { value: '15+', label: 'Expert Trainers' },
        { value: '50+', label: 'Weekly Classes' },
        { value: '10+', label: 'Years Experience' },
      ],
    },
    programs: {
      heading: 'Our Programs',
      subtitle: 'Choose the plan that matches your fitness ambitions',
      fallbackPlans: [
        {
          id: 'default-1',
          name: 'Starter',
          price: 999,
          duration_label: 'per month',
          features: ['Full gym access', 'Locker facility', 'Basic equipment training', 'Fitness assessment'],
          is_popular: false,
        },
        {
          id: 'default-2',
          name: 'Pro',
          price: 1999,
          duration_label: 'per month',
          features: ['Everything in Starter', 'Personal trainer sessions', 'Diet & nutrition plan', 'All group classes', 'Progress tracking'],
          is_popular: true,
        },
        {
          id: 'default-3',
          name: 'Elite',
          price: 3499,
          duration_label: 'per month',
          features: ['Everything in Pro', 'Unlimited PT sessions', 'Spa & recovery access', 'Priority class booking', 'Guest passes included'],
          is_popular: false,
        },
      ],
    },
    trainers: {
      heading: 'Meet Our Trainers',
      subtitle: 'Expert coaches dedicated to helping you reach your goals',
      fallbackTrainers: [
        { id: 'dt-1', name: 'Alex Rivera', specialization: 'Strength & Conditioning', bio: 'NSCA-certified coach with 8+ years helping athletes and beginners build functional strength.' },
        { id: 'dt-2', name: 'Priya Sharma', specialization: 'Yoga & Mobility', bio: 'RYT-500 certified instructor specializing in power yoga, flexibility, and mindful movement.' },
        { id: 'dt-3', name: 'Marcus Chen', specialization: 'HIIT & Cardio', bio: 'High-energy trainer known for dynamic workouts that burn fat, build endurance, and keep you coming back.' },
      ],
    },
    testimonials: {
      heading: 'What Our Members Say',
      subtitle: 'Real stories from real people who changed their lives',
      fallbackTestimonials: [
        { id: 'ft-1', name: 'Rahul M.', message: `Joining ${gymName} was the best decision I made this year. The trainers genuinely care about your progress, and the facility is world-class.`, rating: 5 },
        { id: 'ft-2', name: 'Sneha K.', message: 'I have tried multiple gyms before, but nothing compares. The community here keeps me motivated and the results speak for themselves.', rating: 5 },
        { id: 'ft-3', name: 'Arjun P.', message: 'Clean facility, modern equipment, and trainers who actually know what they are doing. Five stars is not enough.', rating: 5 },
      ],
    },
    cta: {
      heading: 'Ready to Start Your Transformation?',
      subtitle: `Join ${gymName} today and take the first step toward the best version of yourself.`,
      buttonLabel: 'Get Started Now',
      buttonPath: 'pricing',
    },
  }
}
