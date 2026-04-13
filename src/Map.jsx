import { useEffect, useRef } from 'react'
import { scaleQuantile } from 'd3-scale'

const RAMPS = {
  income:  ['#fef9e7','#fce8b0','#f8c86a','#f0a830','#e07820','#c04812','#8b2008'],
  poverty: ['#fde8eb','#f8bdc4','#f08090','#e04055','#cc1830','#98001a','#6b0015'],
  hdi:     ['#f0f7f6','#c8e8e5','#94d0cb','#58b0a8','#2a8880','#006f6a','#004d48'],
}

function getColor(value, domain, metric) {
  if (value == null || !domain.length) return '#ccc8be'
  return scaleQuantile().domain(domain).range(RAMPS[metric])(value)
}

export default function Map({ geoData, valueMap, metric, selected, onSelect, nameMap = {} }) {
  const divRef   = useRef(null)
  const mapRef   = useRef(null)
  const layerRef = useRef(null)

  // Init Leaflet map once
  useEffect(() => {
    if (!divRef.current || mapRef.current) return
    const L = window.L
    if (!L) return

    const map = L.map(divRef.current).setView([9.0, 39.5], 6)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Redraw layer when data/metric/selection changes
  useEffect(() => {
    const L = window.L
    const map = mapRef.current
    if (!L || !map || !geoData?.features?.length) return

    if (layerRef.current) { layerRef.current.remove(); layerRef.current = null }

    const domain = Object.values(valueMap).filter(v => v != null)

    const layer = L.geoJSON(geoData, {
      style: feat => {
        const zc = feat.properties.zone_code   // pre-attached server-side
        const isSel = selected === zc
        return {
          fillColor:   getColor(valueMap[zc], domain, metric),
          fillOpacity: 0.82,
          color:       isSel ? '#1a1208' : '#ffffff',
          weight:      isSel ? 2.5 : 0.6,
          opacity:     1,
        }
      },
      onEachFeature: (feat, lyr) => {
        const zc   = feat.properties.zone_code
        const name = (zc && nameMap[zc]) || feat.properties.zone_name || feat.properties.shapeName || zc || '—'
        lyr.bindTooltip(name, { sticky: true, className: 'map-tip' })
        lyr.on('click',     ()  => onSelect(zc))
        lyr.on('mouseover', e   => e.target.setStyle({ fillOpacity: 1, weight: 1.5 }))
        lyr.on('mouseout',  e   => e.target.setStyle({
          fillOpacity: 0.82,
          weight: selected === zc ? 2.5 : 0.6,
        }))
      },
    }).addTo(map)

    if (!map._fitted) {
      map.fitBounds(layer.getBounds(), { padding: [10, 10] })
      map._fitted = true
    }
    layerRef.current = layer
  }, [geoData, valueMap, metric, selected])

  return (
    <>
      <style>{`
        .map-tip {
          background: rgba(26,18,8,.9);
          color: #fff;
          border: none;
          border-radius: 2px;
          padding: 4px 9px;
          font-size: 11px;
          font-family: 'Noto Sans', sans-serif;
        }
        .leaflet-container {
          background: #e8e4db;
          font-family: 'Noto Sans', sans-serif;
        }
        .leaflet-control-attribution {
          font-size: 9px !important;
          background: rgba(255,255,255,0.75) !important;
          color: #8a8070 !important;
          padding: 2px 5px !important;
        }
        .leaflet-control-attribution a {
          color: #8a8070 !important;
        }
        .leaflet-control-zoom a {
          color: #1a1208 !important;
          font-weight: 400 !important;
        }
      `}</style>
      <div ref={divRef} style={{ width: '100%', height: '100%' }} />
    </>
  )
}
