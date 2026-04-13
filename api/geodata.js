// Vercel serverless function — fetches real Ethiopia ADM2 GeoJSON from geoBoundaries
// Vercel functions have unrestricted network access unlike the browser (no CORS issues)
// Cached via Vercel's CDN cache-control headers

export const config = { runtime: 'edge' }

const GEOBOUNDARIES_API = 'https://www.geoboundaries.org/api/current/gbOpen/ETH/ADM2/'

export default async function handler(req) {
  try {
    // Step 1: Get metadata from geoBoundaries API (has the actual download URL)
    const metaRes = await fetch(GEOBOUNDARIES_API, {
      signal: AbortSignal.timeout(10000),
    })
    if (!metaRes.ok) throw new Error(`Meta fetch failed: ${metaRes.status}`)
    const meta = await metaRes.json()

    // Step 2: Download the simplified GeoJSON
    const gjUrl = meta.simplifiedGeometryGeoJSON
    if (!gjUrl) throw new Error('No gjDownloadURL in response')

    const gjRes = await fetch(gjUrl, { signal: AbortSignal.timeout(30000) })
    if (!gjRes.ok) throw new Error(`GeoJSON fetch failed: ${gjRes.status}`)
    const geojson = await gjRes.json()

    return new Response(JSON.stringify(geojson), {
      headers: {
        'Content-Type': 'application/geo+json',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    // Fallback: return a 503 so the app can fall back to the bundled file
    return new Response(JSON.stringify({ error: err.message }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
