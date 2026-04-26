import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from "../../components/layout/MarketingLayout"
const JOBS = [
  {
    role: 'Frontend Developer',
    location: 'Remote',
  },
  {
    role: 'Customer Success Manager',
    location: 'India',
  },
]

export default function CareersPage() {
  return (
    <MarketingLayout>
      <SectionWrapper>

      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-text-primary">Careers</h1>
        <p className="text-text-secondary mt-4">
          Join us in building the future of gym management.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {JOBS.map((job) => (
          <div key={job.role} className="border border-border rounded-xl p-6 flex justify-between items-center">
            <div>
              <h3 className="text-text-primary font-bold">{job.role}</h3>
              <p className="text-text-muted text-sm">{job.location}</p>
            </div>

            <button className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm">
              Apply
            </button>
          </div>
        ))}
      </div>

      </SectionWrapper>

    </MarketingLayout>
  )
}