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

// Map geoBoundaries shapeName → our zone_code
// geoBoundaries uses English admin names; we map them to our ET0xxxxx codes
const NAME_TO_CODE = {
  // Tigray
  'Tigray Central Zone': 'ET010100', 'Central Tigray': 'ET010100',
  'Eastern Tigray': 'ET010200', 'North Western Tigray': 'ET010300',
  'Southern Tigray': 'ET010400', 'Western Tigray': 'ET010500',
  // Afar
  'Awsi-Rasu': 'ET020100', 'Zone 1': 'ET020100',
  'Kilbati-Rasu': 'ET020200', 'Zone 2': 'ET020200',
  'Gabi-Rasu': 'ET020300', 'Zone 3': 'ET020300',
  'Fantana-Rasu': 'ET020400', 'Zone 4': 'ET020400',
  'Hari-Rasu': 'ET020500', 'Zone 5': 'ET020500',
  // Amhara
  'Waghimra': 'ET030100', 'North Wollo': 'ET030200',
  'South Wollo': 'ET030300', 'East Gojam': 'ET030500',
  'West Gojam': 'ET030600', 'Awi': 'ET030700',
  'North Gondar': 'ET030900', 'Central Gondar': 'ET030900',
  'South Gondar': 'ET031000', 'North Shewa': 'ET031100',
  'North Shewa Zone 3': 'ET031100',
  // Oromia
  'West Hararge': 'ET040100', 'East Hararge': 'ET040200',
  'Arsi': 'ET040300', 'Bale': 'ET040400',
  'West Guji': 'ET040500', 'Borena': 'ET040700',
  'West Shewa': 'ET040800', 'North Shewa Zone 4': 'ET040900',
  'East Shewa': 'ET041000', 'Jimma': 'ET041100',
  'Illubabor': 'ET041200', 'Kelam Wellega': 'ET041300',
  'East Wellega': 'ET041400', 'West Wellega': 'ET041500',
  // Somali
  'Jigjiga': 'ET050100', 'Jijiga': 'ET050100',
  'Fik': 'ET050200', 'Warder': 'ET050300',
  'Liben': 'ET050400', 'Degehabur': 'ET050500',
  'Korahe': 'ET050600', 'Gode': 'ET050700',
  // Benshangul-Gumuz
  'Metekel': 'ET060100', 'Assosa': 'ET060200', 'Kamashi': 'ET060300',
  // SNNPR
  'Gurage': 'ET070100', 'Sidama': 'ET070200',
  'Wolaita': 'ET070300', 'Gamo': 'ET070400',
  'Dawro': 'ET070500', 'Hadiya': 'ET070600',
  'Kembata Tembaro': 'ET070700', 'Kambata Tambaro': 'ET070700',
  'Bench Maji': 'ET070800', 'Bench Sheko': 'ET070800',
  'South Omo': 'ET070900',
  // Gambella
  'Agnewak': 'ET120100', 'Anywaa': 'ET120100',
  'Nuer': 'ET120200', 'Nuwer': 'ET120200',
  // City states
  'Harari': 'ET130100', 'Hareri': 'ET130100',
  'Addis Ababa': 'ET140100',
  'Dire Dawa': 'ET150100',
}

function resolveCode(props) {
  // Try shapeName directly
  const name = props.shapeName || props.NAME_2 || props.admin2Name_en || ''
  if (NAME_TO_CODE[name]) return NAME_TO_CODE[name]
  // Try partial match
  for (const [k, v] of Object.entries(NAME_TO_CODE)) {
    if (name.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(name.toLowerCase())) return v
  }
  // Try pcode
  const pcode = props.shapeID || props.admin2Pcode || ''
  if (pcode.startsWith('ET')) return pcode.substring(0, 8)
  return null
}

export default function Map({ geoData, valueMap, metric, selected, onSelect }) {
  const divRef   = useRef(null)
  const mapRef   = useRef(null)
  const layerRef = useRef(null)

  // Init map once
  useEffect(() => {
    if (!divRef.current || mapRef.current) return
    const L = window.L
    if (!L) { console.error('Leaflet not loaded'); return }

    const map = L.map(divRef.current).setView([9.0, 39.5], 6)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Update GeoJSON layer
  useEffect(() => {
    const L = window.L
    const map = mapRef.current
    if (!L || !map || !geoData?.features?.length) return

    if (layerRef.current) { layerRef.current.remove(); layerRef.current = null }

    const domain = Object.values(valueMap).filter(v => v != null)

    const layer = L.geoJSON(geoData, {
      style: feat => {
        const zc = feat.properties._zc || resolveCode(feat.properties)
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
        const zc = feat.properties._zc || resolveCode(feat.properties)
        feat.properties._zc = zc  // cache it
        const name = feat.properties.shapeName || feat.properties.zone_name || feat.properties.NAME_2 || zc
        lyr.bindTooltip(name, { sticky: true, className: 'map-tip' })
        lyr.on('click',     () => onSelect(zc))
        lyr.on('mouseover', e  => e.target.setStyle({ fillOpacity: 1, weight: 1.5 }))
        lyr.on('mouseout',  e  => e.target.setStyle({ fillOpacity: 0.82, weight: selected === zc ? 2.5 : 0.6 }))
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
      <style>{`.map-tip{background:rgba(26,18,8,.88);color:#fff;border:none;border-radius:2px;padding:3px 8px;font-size:11px;font-family:'Noto Sans',sans-serif}`}</style>
      <div ref={divRef} style={{ width: '100%', height: '100%' }} />
    </>
  )
}
