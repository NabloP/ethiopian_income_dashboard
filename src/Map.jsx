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

// Precise mapping from geoBoundaries shapeName → our zone_code
// Built from actual shapefile inspection (74 features)
const NAME_TO_CODE = {
  // Tigray (5)
  'Central':           'ET010100',  // Tigray Central
  'Eastern\n':         'ET010200',  // Tigray Eastern (has trailing newline in source)
  'Eastern':           'ET010200',
  'North Western':     'ET010300',  // Tigray NW
  'Southern':          'ET010400',  // Tigray Southern
  'Western':           'ET010500',  // Tigray Western
  // Afar (5)
  'Zone 1':            'ET020100',  // Awsi Rasu
  'Zone 2':            'ET020200',  // Kilbati Rasu
  'Zone 3':            'ET020300',  // Gabi Rasu
  'Zone 4':            'ET020400',  // Fantana Rasu
  'Zone 5':            'ET020500',  // Hari Rasu
  // Amhara (9)
  'Wag Himra':         'ET030100',
  'North Wollo':       'ET030200',
  'South Wollo':       'ET030300',
  'East Gojam':        'ET030500',
  'West Gojam':        'ET030600',
  'Awi/Agew':          'ET030700',
  'North Gonder':      'ET030900',
  'South Gonder':      'ET031000',
  'North Shewa(R3)':   'ET031100',  // North Shewa Amhara
  // Oromia (14)
  'West Harerge':      'ET040100',
  'East Harerge':      'ET040200',
  'Arsi':              'ET040300',
  'Bale':              'ET040400',
  'Guji':              'ET040500',  // West Guji
  'Borena':            'ET040700',
  'West Shewa':        'ET040800',
  'North Shewa(R4)':   'ET040900',  // North Shewa Oromia
  'East Shewa':        'ET041000',
  'Jimma':             'ET041100',
  'Ilubabor':          'ET041200',
  'Kelem Wellega':     'ET041300',
  'East Wellega':      'ET041400',
  'West Wellega':      'ET041500',
  'Horo Guduru':       'ET041400',  // part of East Wellega area
  'South West Shewa':  'ET040800',
  // Somali (7)
  'Fafan':             'ET050100',  // replaces Jijiga in new admin
  'Jarar':             'ET050200',  // replaces Fik
  'Afder':             'ET050700',  // Gode / Afder
  'Liben':             'ET050400',
  'Korahe':            'ET050600',
  'Nogob':             'ET050300',  // Warder / Nogob
  'Shabelle':          'ET050500',  // Degehabur / Shabelle
  'Doolo':             'ET050300',
  'Siti':              'ET050100',
  // Benshangul-Gumuz (3)
  'Metekel':           'ET060100',
  'Asosa':             'ET060200',
  'Kemashi':           'ET060300',
  // SNNPR/Southwest (9)
  'Gurage':            'ET070100',
  'Sidama':            'ET070200',
  'Wolayita':          'ET070300',
  'Gamo Gofa':         'ET070400',
  'Dawro':             'ET070500',
  'Hadiya':            'ET070600',
  'KT':                'ET070700',  // Kambata Tambaro
  'Bench Maji':        'ET070800',
  'South Omo':         'ET070900',
  'Keffa':             'ET070800',
  'Sheka':             'ET070800',
  'Alaba':             'ET070600',
  'Selti':             'ET070100',
  'Gedio':             'ET070200',
  'Konta':             'ET070500',
  'Basketo':           'ET070800',
  'West Arsi':         'ET040300',
  'Yem':               'ET070700',
  'Special Woreda':    'ET070200',
  'Segen Peoples\'':   'ET070900',
  'Majang':            'ET120100',
  // Gambella (2)
  'Agnuak':            'ET120100',
  'Nuer':              'ET120200',
  // City-states
  'Hareri':            'ET130100',
  'Oromia':            'ET040900',  // Addis Ababa surrounding Oromia special zone
  'Region 14':         'ET140100',  // Addis Ababa
  'Dire Dawa':         'ET150100',
}

function resolveCode(props) {
  const name = (props.shapeName || '').trim()
  return NAME_TO_CODE[name] || NAME_TO_CODE[name + '\n'] || null
}

export default function Map({ geoData, valueMap, metric, selected, onSelect }) {
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

  // Redraw GeoJSON layer on data/metric/selection change
  useEffect(() => {
    const L = window.L
    const map = mapRef.current
    if (!L || !map || !geoData?.features?.length) return

    if (layerRef.current) { layerRef.current.remove(); layerRef.current = null }

    const domain = Object.values(valueMap).filter(v => v != null)

    const layer = L.geoJSON(geoData, {
      style: feat => {
        const zc = feat.properties._zc
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
        // Cache zone_code on the feature properties
        if (!feat.properties._zc) {
          feat.properties._zc = feat.properties.zone_code || resolveCode(feat.properties)
        }
        const zc   = feat.properties._zc
        const name = feat.properties.shapeName || feat.properties.zone_name || zc || '—'
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
          box-shadow: 0 1px 4px rgba(0,0,0,.3);
        }
      `}</style>
      <div ref={divRef} style={{ width: '100%', height: '100%' }} />
    </>
  )
}
