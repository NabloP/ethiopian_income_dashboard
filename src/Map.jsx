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
  const divRef    = useRef(null)
  const mapRef    = useRef(null)
  const layerRef  = useRef(null)   // the L.geoJSON layer
  const featsRef  = useRef({})     // zone_code → Leaflet layer, for imperative updates
  const stateRef  = useRef({ valueMap, metric, selected, nameMap })

  // Keep stateRef in sync so event handlers always read current values
  // without needing to be re-registered
  stateRef.current = { valueMap, metric, selected, nameMap }

  // ── Effect 1: init map once ───────────────────────────────────────
  useEffect(() => {
    if (!divRef.current || mapRef.current) return
    const L = window.L
    if (!L) return

    const map = L.map(divRef.current, { zoomControl: true }).setView([9.0, 39.5], 6)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // ── Effect 2: build GeoJSON layer once when geoData arrives ──────
  // Only depends on geoData. Never torn down on metric/selection changes.
  useEffect(() => {
    const L = window.L
    const map = mapRef.current
    if (!L || !map || !geoData?.features?.length) return

    // Remove any previous layer (e.g. fallback → real shapefile swap)
    if (layerRef.current) {
      layerRef.current.remove()
      layerRef.current = null
      featsRef.current = {}
    }

    const { valueMap, metric, selected, nameMap } = stateRef.current
    const domain = Object.values(valueMap).filter(v => v != null)

    const layer = L.geoJSON(geoData, {
      style: feat => {
        const zc = feat.properties.zone_code
        const isSel = stateRef.current.selected === zc
        return {
          fillColor:   getColor(valueMap[zc], domain, metric),
          fillOpacity: isSel ? 1 : 0.82,
          color:       isSel ? '#1a1208' : '#ffffff',
          weight:      isSel ? 2.5 : 0.6,
          opacity:     1,
        }
      },
      onEachFeature: (feat, lyr) => {
        const zc = feat.properties.zone_code
        if (zc) featsRef.current[zc] = lyr

        // Tooltip — uses stateRef so name stays current without re-registration
        const name = () => {
          const { nameMap } = stateRef.current
          return (zc && nameMap[zc]) || feat.properties.zone_name || feat.properties.shapeName || zc || '—'
        }
        lyr.bindTooltip(name, { sticky: true, className: 'map-tip' })

        lyr.on('click', () => {
          // onSelect is stable (defined in App), but capture it via closure on first registration.
          // We need to call the *current* onSelect — pass it via stateRef isn't possible since
          // it's a prop not stored there. Work-around: store it on the map object.
          mapRef.current._onSelect?.(zc)
        })

        lyr.on('mouseover', () => {
          lyr.setStyle({ fillOpacity: 1, weight: 1.5 })
          lyr.bringToFront()
        })

        lyr.on('mouseout', () => {
          const { selected } = stateRef.current
          const isSel = selected === zc
          lyr.setStyle({
            fillOpacity: isSel ? 1 : 0.82,
            color:       isSel ? '#1a1208' : '#ffffff',
            weight:      isSel ? 2.5 : 0.6,
          })
        })
      },
    }).addTo(map)

    map.fitBounds(layer.getBounds(), { padding: [10, 10] })
    layerRef.current = layer
  }, [geoData])  // ← geoData only. NOT metric/valueMap/selected.

  // ── Effect 3: keep onSelect reference current on the map object ──
  useEffect(() => {
    if (mapRef.current) mapRef.current._onSelect = onSelect
  }, [onSelect])

  // ── Effect 4: recolor all features when valueMap or metric changes ─
  useEffect(() => {
    const feats = featsRef.current
    if (!Object.keys(feats).length) return

    const domain = Object.values(valueMap).filter(v => v != null)
    const { selected } = stateRef.current

    Object.entries(feats).forEach(([zc, lyr]) => {
      const isSel = selected === zc
      lyr.setStyle({
        fillColor:   getColor(valueMap[zc], domain, metric),
        fillOpacity: isSel ? 1 : 0.82,
        color:       isSel ? '#1a1208' : '#ffffff',
        weight:      isSel ? 2.5 : 0.6,
      })
    })
  }, [valueMap, metric])

  // ── Effect 5: update highlight when selected changes ─────────────
  useEffect(() => {
    const feats = featsRef.current
    if (!Object.keys(feats).length) return

    const domain = Object.values(valueMap).filter(v => v != null)

    Object.entries(feats).forEach(([zc, lyr]) => {
      const isSel = selected === zc
      lyr.setStyle({
        fillColor:   getColor(valueMap[zc], domain, metric),
        fillOpacity: isSel ? 1 : 0.82,
        color:       isSel ? '#1a1208' : '#ffffff',
        weight:      isSel ? 2.5 : 0.6,
      })
      if (isSel) lyr.bringToFront()
    })
  }, [selected])  // ← selected only

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
        .leaflet-control-attribution a { color: #8a8070 !important; }
        .leaflet-control-zoom a {
          color: #1a1208 !important;
          font-weight: 400 !important;
        }
      `}</style>
      <div ref={divRef} style={{ width: '100%', height: '100%' }} />
    </>
  )
}
