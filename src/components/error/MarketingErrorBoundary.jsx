import { Component } from 'react'

export default class MarketingErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[MarketingErrorBoundary]', error, info?.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false })
    if (typeof window !== 'undefined') window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <section className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-3xl font-extrabold text-text-primary mb-4">
            Something went wrong
          </h1>
          <p className="text-text-muted mb-8">
            We hit an unexpected error loading this page. Please try refreshing — if the issue persists, contact support.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-6 py-3 bg-accent-purple text-white rounded-xl font-semibold hover:opacity-90 transition"
          >
            Reload page
          </button>
        </div>
      </section>
    )
  }
}
