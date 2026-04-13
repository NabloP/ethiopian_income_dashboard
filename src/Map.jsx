import { useEffect, useRef } from 'react'
import { scaleQuantile } from 'd3-scale'

// Leaflet loaded globally via CDN in index.html — window.L is always available

const RAMPS = {
  income:  ['#fef9e7','#fce8b0','#f8c86a','#f0a830','#e07820','#c04812','#8b2008'],
  poverty: ['#fde8eb','#f8bdc4','#f08090','#e04055','#cc1830','#98001a','#6b0015'],
  hdi:     ['#f0f7f6','#c8e8e5','#94d0cb','#58b0a8','#2a8880','#006f6a','#004d48'],
}

function getColor(value, domain, metric) {
  if (value == null || !domain.length) return '#ccc8be'
  return scaleQuantile().domain(domain).range(RAMPS[metric])(value)
}

export default function Map({ geoData, valueMap, metric, selected, onSelect }) {
  const divRef      = useRef(null)
  const mapRef      = useRef(null)
  const layerRef    = useRef(null)

  // Init map once
  useEffect(() => {
    if (!divRef.current || mapRef.current) return
    const L = window.L
    if (!L) return

    const map = L.map(divRef.current).setView([9.0, 39.5], 6)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map)

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Update GeoJSON layer when data changes
  useEffect(() => {
    const L = window.L
    const map = mapRef.current
    if (!L || !map || !geoData?.features?.length) return

    if (layerRef.current) { layerRef.current.remove(); layerRef.current = null }

    const domain = Object.values(valueMap).filter(v => v != null)

    const layer = L.geoJSON(geoData, {
      style: feat => {
        const zc = feat.properties.zone_code
        const isSel = selected === zc
        return {
          fillColor:   getColor(valueMap[zc], domain, metric),
          fillOpacity: 0.8,
          color:       isSel ? '#1a1208' : '#fff',
          weight:      isSel ? 2 : 0.5,
          opacity:     1,
        }
      },
      onEachFeature: (feat, lyr) => {
        const zc = feat.properties.zone_code
        lyr.bindTooltip(feat.properties.zone_name, { sticky: true })
        lyr.on('click', () => onSelect(zc))
        lyr.on('mouseover', e => e.target.setStyle({ fillOpacity: 1 }))
        lyr.on('mouseout',  e => e.target.setStyle({ fillOpacity: 0.8 }))
      },
    }).addTo(map)

    // Fit to bounds on first data load
    if (!map._fitted) { map.fitBounds(layer.getBounds(), { padding: [10,10] }); map._fitted = true }
    layerRef.current = layer
  }, [geoData, valueMap, metric, selected])

  return <div ref={divRef} style={{ width:'100%', height:'100%' }}/>
}
