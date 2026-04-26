import { mapHeroData } from '../../../features/cms/hero/heroMapper.js'
import { HERO_REGISTRY } from '../../../features/cms/hero/heroRegistry.js'
import { useRef } from 'react'

export default function HeroSection({ gym, content, defaults }) {
  const sectionRef = useRef(null)

  // 🎯 1. Normalize data
  const data = mapHeroData({ gym, content, defaults })

  // 🎯 2. Resolve variant — trust what's saved in DB (CMS enforces plan gating)
  const style = gym?.hero_style || 'A'
  const Component = (HERO_REGISTRY[style] || HERO_REGISTRY['A']).component

  // 🎯 3. Pass ONLY normalized data
  return <Component ref={sectionRef} data={data} />
}