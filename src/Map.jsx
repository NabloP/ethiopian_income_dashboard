import { useMemo } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import { scaleQuantile } from 'd3-scale'

const RAMPS = {
  income:  ['#fef9e7','#fce8b0','#f8c86a','#f0a830','#e07820','#c04812','#8b2008'],
  poverty: ['#ffffff','#fde8eb','#f8bdc4','#f08090','#e04055','#cc1830','#98001a'],
  hdi:     ['#f0f7f6','#c8e8e5','#94d0cb','#58b0a8','#2a8880','#006f6a','#004d48'],
}

// Fixed logical canvas — SVG viewBox scales to any container size
const W = 800, H = 700

export default function Map({ geoData, valueMap, metric, selected, onSelect, flashZone }) {
  const { paths, colorFn } = useMemo(() => {
    if (!geoData?.features?.length) return { paths: [], colorFn: () => '#ccc' }

    // fitSize to fixed logical canvas — always fills, always correct
    const proj = geoMercator().fitSize([W, H], geoData)
    const gen  = geoPath().projection(proj)

    const domain = Object.values(valueMap).filter(v => v != null)
    const cf = domain.length
      ? scaleQuantile().domain(domain).range(RAMPS[metric])
      : () => '#d4cfc4'   // visible grey when no data yet

    const ps = geoData.features.map(feat => {
      const d  = gen(feat)
      const zc = feat.properties.zone_code
      return d ? { zc, d, name: feat.properties.zone_name } : null
    }).filter(Boolean)

    return { paths: ps, colorFn: cf }
  }, [geoData, valueMap, metric])

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block', background: '#ddd8cc' }}
    >
      {paths.map(({ zc, d }) => {
        const val    = valueMap[zc]
        const isSel  = selected === zc
        const isFlash = flashZone === zc
        return (
          <path
            key={zc}
            d={d}
            fill={colorFn(val)}
            stroke={isSel ? '#1a1208' : '#ffffff'}
            strokeWidth={isSel ? 1.2 : 0.4}
            opacity={isFlash ? 0.35 : isSel ? 1 : 0.9}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelect(zc)}
          >
            <title>{d && valueMap[zc] != null ? `${zc}` : zc}</title>
          </path>
        )
      })}
    </svg>
  )
}
