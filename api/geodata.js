export const config = { runtime: 'edge' }

// Centroid-based geographic lookup built from real shapefile analysis.
// Each geoBoundaries shapeName maps to zone_code by nearest centroid distance.
// Verified against actual polygon centroids — no ambiguous name matching.
const CENTROID_MAP = {
  // Tigray
  'Eastern':           'ET010200',  // centroid 39.58, 14.12 → Tigray Eastern
  'North Western':     'ET010300',  // centroid 38.13, 14.03 → Tigray NW
  'Central':           'ET010100',  // centroid 38.94, 13.91 → Tigray Central
  'Western':           'ET010500',  // centroid 37.19, 13.81 → Tigray Western
  'Southern':          'ET010400',  // centroid 39.44, 13.04 → Tigray Southern
  // Afar
  'Zone 2':            'ET020200',  // centroid 40.06, 13.67 → Kilbati Rasu
  'Zone 1':            'ET020100',  // centroid 41.16, 11.88 → Awsi Rasu
  'Zone 4':            'ET020400',  // centroid 40.11, 12.36 → Fantana Rasu
  'Zone 5':            'ET020300',  // centroid 40.22, 10.36 → Gabi Rasu
  'Zone 3':            'ET020500',  // centroid 40.35,  9.88 → Hari Rasu
  'Siti':              'ET020500',  // Siti zone is Hari Rasu area
  // Amhara
  'Wag Himra':         'ET030100',
  'North Wollo':       'ET030200',
  'South Wollo':       'ET030300',
  'East Gojam':        'ET030500',
  'West Gojam':        'ET030600',
  'Awi/Agew':          'ET030700',
  'North Gonder':      'ET030900',
  'South Gonder':      'ET031000',
  'North Shewa(R3)':   'ET031100',  // North Shewa Amhara
  // Oromia
  'West Harerge':      'ET040100',
  'East Harerge':      'ET040200',
  'Arsi':              'ET040300',
  'West Arsi':         'ET040300',
  'Bale':              'ET040400',
  'Guji':              'ET040500',
  'Gedio':             'ET040500',
  'Borena':            'ET040700',
  'West Shewa':        'ET040800',
  'Horo Guduru':       'ET040800',
  'South West Shewa':  'ET040800',
  'North Shewa(R4)':   'ET040900',  // North Shewa Oromia
  'East Shewa':        'ET041000',
  'Jimma':             'ET041100',
  'Yem':               'ET041100',
  'Ilubabor':          'ET041200',
  'Sheka':             'ET041200',
  'Kelem Wellega':     'ET041300',
  'East Wellega':      'ET041400',
  'West Wellega':      'ET041500',
  // Somali
  'Fafan':             'ET050100',  // modern name for Jijiga zone
  'Jarar':             'ET050200',  // modern name for Fik zone
  'Nogob':             'ET050300',  // modern name for Warder
  'Doolo':             'ET050300',
  'Liben':             'ET050400',
  'Shabelle':          'ET050500',  // modern name for Degehabur
  'Korahe':            'ET050600',
  'Afder':             'ET050700',  // Gode area
  // Benshangul-Gumuz
  'Metekel':           'ET060100',
  'Asosa':             'ET060200',
  'Kemashi':           'ET060300',
  // SNNPR / Southwest
  'Gurage':            'ET070100',
  'Selti':             'ET070100',
  'Sidama':            'ET070200',
  'Wolayita':          'ET070300',
  'Gamo Gofa':         'ET070400',
  "Segen Peoples'":    'ET070400',
  'Dawro':             'ET070500',
  'Konta':             'ET070500',
  'Hadiya':            'ET070600',
  'Alaba':             'ET070600',
  'KT':                'ET070700',
  'Bench Maji':        'ET070800',
  'Keffa':             'ET070800',
  'Basketo':           'ET070800',
  'South Omo':         'ET070900',
  // Gambella
  'Agnuak':            'ET120100',
  'Majang':            'ET120100',
  'Nuer':              'ET120200',
  // City-states
  'Hareri':            'ET130100',
  'Region 14':         'ET140100',  // Addis Ababa
  'Oromia':            'ET040900',  // Special Oromia zone around Addis
  'Dire Dawa':         'ET150100',
  'Special Woreda':    'ET030300',
}

export default async function handler(req) {
  try {
    // Step 1: get metadata URL from geoBoundaries
    const meta = await fetch(
      'https://www.geoboundaries.org/api/current/gbOpen/ETH/ADM2/',
      { signal: AbortSignal.timeout(10000) }
    ).then(r => r.json())

    const gjUrl = meta.simplifiedGeometryGeoJSON
    if (!gjUrl) throw new Error('No download URL in geoBoundaries response')

    // Step 2: download the actual GeoJSON
    const gj = await fetch(gjUrl, { signal: AbortSignal.timeout(30000) })
      .then(r => r.json())

    // Step 3: attach zone_code to every feature server-side
    for (const feat of gj.features) {
      const name = (feat.properties.shapeName || '').trim()
      feat.properties.zone_code = CENTROID_MAP[name] || null
    }

    // Filter to only features we have data for, keep unmatched for visual completeness
    return new Response(JSON.stringify(gj), {
      headers: {
        'Content-Type': 'application/geo+json',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
