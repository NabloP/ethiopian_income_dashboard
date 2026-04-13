import { useEffect, useRef } from 'react'
import { scaleQuantile } from 'd3-scale'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const RAMPS = {
  income:  ['#fef9e7','#fce8b0','#f8c86a','#f0a830','#e07820','#c04812','#8b2008'],
  poverty: ['#fde8eb','#f8bdc4','#f08090','#e04055','#cc1830','#98001a','#6b0015'],
  hdi:     ['#f0f7f6','#c8e8e5','#94d0cb','#58b0a8','#2a8880','#006f6a','#004d48'],
}

function getColor(value, values, metric) {
  if (value == null) return '#d4cfc4'
  const domain = values.filter(v => v != null)
  if (!domain.length) return '#d4cfc4'
  const q = scaleQuantile().domain(domain).range(RAMPS[metric])
  return q(value)
}

export default function Map({ geoData, valueMap, metric, selected, onSelect }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const geoLayerRef  = useRef(null)

  // Init Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [9.0, 39.5],
      zoom: 6,
      zoomControl: true,
      scrollWheelZoom: true,
    })

    // Free OpenStreetMap tiles — no API key needed
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Re-draw GeoJSON layer when data/metric/selection changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !geoData?.features?.length) return

    // Remove old layer
    if (geoLayerRef.current) {
      geoLayerRef.current.remove()
      geoLayerRef.current = null
    }

    const values = Object.values(valueMap)

    const layer = L.geoJSON(geoData, {
      style: (feature) => {
        const zc  = feature.properties.zone_code
        const val = valueMap[zc]
        const isSel = selected === zc
        return {
          fillColor:   getColor(val, values, metric),
          fillOpacity: 0.82,
          color:       isSel ? '#1a1208' : '#ffffff',
          weight:      isSel ? 2 : 0.5,
          opacity:     1,
        }
      },
      onEachFeature: (feature, layer) => {
        const zc = feature.properties.zone_code
        const zn = feature.properties.zone_name
        const val = valueMap[zc]
        layer.bindTooltip(zn, { sticky: true, className: 'map-tooltip' })
        layer.on({
          click: () => onSelect(zc),
          mouseover: (e) => { e.target.setStyle({ fillOpacity: 1, weight: 1.5 }) },
          mouseout:  (e) => { layer.resetStyle ? layer.resetStyle() : e.target.setStyle({ fillOpacity: 0.82, weight: selected === zc ? 2 : 0.5 }) },
        })
      },
    }).addTo(map)

    geoLayerRef.current = layer

    // Fit map to Ethiopia bounds on first load
    if (Object.keys(valueMap).length === 0 || !mapRef.current._fittedBounds) {
      map.fitBounds(layer.getBounds(), { padding: [10, 10] })
      mapRef.current._fittedBounds = true
    }
  }, [geoData, valueMap, metric, selected])

  return (
    <>
      <style>{`
        .map-tooltip {
          background: rgba(26,18,8,0.88);
          color: #fff;
          border: none;
          border-radius: 2px;
          padding: 3px 7px;
          font-size: 11px;
          font-family: 'Noto Sans', system-ui, sans-serif;
        }
        .leaflet-container { font-family: 'Noto Sans', system-ui, sans-serif; }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </>
  )
}
