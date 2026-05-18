import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store/AuthContext'
import { useDismissedBanners } from '../../../hooks/useDismissedBanners'
import { useDashboardSnapshot } from '../../../hooks/useDashboardSnapshot'
import { pickBanners } from '../../../lib/dashboard/bannerConfig'
import DashboardBanner from './DashboardBanner'

/**
 * BannerSlot — drop into any dashboard page to render contextual banners.
 *
 * Props:
 *   pageKey  — string matching BANNERS[i].pages (e.g. 'dashboard', 'analytics')
 *   context  — optional { gym, stats, ... } overrides. If omitted, the slot
 *              auto-fetches a cached gym+stats snapshot.
 *   limit    — max banners to stack (default 2; keep ≤ 3 to avoid clutter)
 *
 * Banners are stacked top-to-bottom in priority order with `space-y-3`.
 * Subscription is auto-merged from AuthContext.
 */
export default function BannerSlot({ pageKey, context, limit = 2 }) {
  const navigate = useNavigate()
  const { subscription } = useAuth()
  const { dismissed, dismiss } = useDismissedBanners()
  const snapshot = useDashboardSnapshot()

  const fullContext = useMemo(() => ({
    subscription,
    gym:   context?.gym   ?? snapshot.gym,
    stats: context?.stats ?? snapshot.stats,
    ...context,
  }), [subscription, snapshot.gym, snapshot.stats, context])

  const banners = useMemo(
    () => pickBanners(pageKey, fullContext, dismissed, limit),
    [pageKey, fullContext, dismissed, limit],
  )

  if (banners.length === 0) return null

  return (
    <div className="space-y-3">
      {banners.map(banner => (
        <DashboardBanner
          key={banner.id}
          variant={banner.variant}
          backgroundType={banner.backgroundType}
          label={banner.label}
          title={banner.title}
          description={banner.description}
          icon={banner.icon}
          ctaLabel={banner.ctaLabel}
          ctaAction={() => banner.ctaPath && navigate(banner.ctaPath)}
          secondaryAction={
            banner.secondaryAction
              ? { label: banner.secondaryAction.label, action: () => navigate(banner.secondaryAction.path) }
              : null
          }
          dismissible={banner.dismissible}
          onDismiss={() => dismiss(banner.id)}
        />
      ))}
    </div>
  )
}
