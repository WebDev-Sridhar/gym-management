import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import SectionContainer, { Eyebrow } from '../ui/SectionContainer'
import ScrollReveal, { StaggerGroup, StaggerItem, fadeUp } from '../ui/ScrollReveal'

const FAQS = [
  {
    question: 'How long does it take to set up Gymmobius?',
    answer: 'Most gyms are fully set up in under a day. Import your existing members via spreadsheet, configure your membership plans, and your branded member app and dashboard are ready to go — no technical setup required.',
  },
  {
    question: 'Can members pay through the app?',
    answer: 'Yes. Members can renew memberships, pay dues, and view receipts directly from the member app via UPI, card, or cash logging by your front desk — all reconciled automatically in your dashboard.',
  },
  {
    question: 'Do you support multiple branches?',
    answer: 'The Premium plan includes multi-branch operations with consolidated reporting, so you can manage members, staff, and revenue across every location from one account.',
  },
  {
    question: 'What happens after my free trial ends?',
    answer: "You'll be prompted to choose a plan that fits your gym's size. Your data, members, and settings carry over automatically — nothing is lost, and there's no forced downtime.",
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, all plans are billed monthly (or yearly with a discount) with no long-term lock-in. You can cancel anytime from your billing settings.',
  },
  {
    question: 'Is my data secure?',
    answer: 'All data is encrypted in transit and at rest, with role-based access for owners, trainers, and members. See our Security page for full details on our infrastructure and compliance practices.',
  },
]

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div className="border-b border-gray-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-6 text-left"
      >
        <span className="text-base sm:text-lg font-medium text-gray-900">{item.question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500"
        >
          <Plus size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-sm sm:text-base text-gray-500 leading-relaxed pr-12">{item.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <SectionContainer background="white">
      <div className="grid lg:grid-cols-3 gap-12">
        <ScrollReveal variant={fadeUp}>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-base text-gray-500 leading-relaxed">
            Can't find what you're looking for? Reach out to our team and we'll get back to you within a business day.
          </p>
        </ScrollReveal>

        <StaggerGroup className="lg:col-span-2">
          {FAQS.map((item, index) => (
            <StaggerItem key={item.question} variant={fadeUp}>
              <FAQItem
                item={item}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
              />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </SectionContainer>
  )
}
