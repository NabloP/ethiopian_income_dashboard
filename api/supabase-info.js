export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Edge functions get runtime env vars (no VITE_ prefix at runtime)
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? null;
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? null;

  const results = { env: { url_set: Boolean(url), key_set: Boolean(key) } };

  // If env vars are set, test the live DB
  if (url && key) {
    try {
      const r = await fetch(`${url}/rest/v1/eth_zone_metrics?select=count&limit=1`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
      });
      const body = await r.text();
      results.db_test = { status: r.status, body: body.substring(0, 200) };
      results.table_exists = r.status === 200;
    } catch(e) {
      results.db_test = { error: e.message };
      results.table_exists = false;
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
