import { motion } from 'framer-motion'
import SectionWrapper from '../../components/layout/SectionWrapper'
import { fadeUp } from '../../lib/animations'
import MarketingLayout from '../../components/layout/MarketingLayout'

const CHANGELOG = [
  {
    version: 'v1.2.0',
    date: 'April 2026',
    changes: [
      'Custom domain support',
      'Hero CMS improvements',
      'Performance optimizations',
    ],
  },
  {
    version: 'v1.1.0',
    date: 'March 2026',
    changes: [
      'WhatsApp payment links',
      'Trainer management system',
    ],
  },
  {
    version: 'v1.0.0',
    date: 'February 2026',
    changes: [
      'Initial SaaS launch',
      'Member management',
      'QR attendance',
    ],
  },
]

export default function ChangelogPage() {
  return (
    <MarketingLayout>
    <div className="relative overflow-hidden">

      <SectionWrapper>
        <div className="text-center mb-16">
          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-extrabold text-text-primary"
          >
            Changelog
          </motion.h1>
          <p className="text-text-secondary mt-4">
            See what’s new and improved.
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-10">
          {CHANGELOG.map((item) => (
            <motion.div key={item.version} variants={fadeUp}>
              <div className="border border-border rounded-xl p-6 bg-bg-elevated/30">

                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-text-primary">
                    {item.version}
                  </h3>
                  <span className="text-sm text-text-muted">
                    {item.date}
                  </span>
                </div>

                <ul className="space-y-2 text-text-secondary text-sm">
                  {item.changes.map((c) => (
                    <li key={c}>• {c}</li>
                  ))}
                </ul>

              </div>
            </motion.div>
          ))}
        </div>

      </SectionWrapper>

    </div>
    </MarketingLayout>
  )
}