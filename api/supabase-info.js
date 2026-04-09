export const config = { runtime: 'edge' };

export default async function handler(req) {
  const PAT = 'sbp_355deee83d82301914b40ea637b2444974b64163';
  const url  = process.env.VITE_SUPABASE_URL ?? null;
  const key  = process.env.VITE_SUPABASE_ANON_KEY ?? null;
  
  const results = { env: { url_set: Boolean(url), key_set: Boolean(key) }, auth_tests: {} };

  // Test every known Supabase PAT auth format
  const attempts = [
    ['bearer_v1',        'https://api.supabase.com/v1/projects',         { 'Authorization': `Bearer ${PAT}` }],
    ['bearer_v1_ct',     'https://api.supabase.com/v1/projects',         { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' }],
    ['apikey_header',    'https://api.supabase.com/v1/projects',         { 'apikey': PAT }],
    ['x_api_key',        'https://api.supabase.com/v1/projects',         { 'x-api-key': PAT }],
    // Try the CLI token format used by supabase login
    ['bearer_cli_url',   'https://api.supabase.com/v1/projects',         { 'Authorization': `Bearer ${PAT}`, 'User-Agent': 'supabase-cli/1.0' }],
  ];

  for (const [name, endpoint, headers] of attempts) {
    try {
      const r = await fetch(endpoint, { headers });
      const body = await r.text();
      results.auth_tests[name] = { status: r.status, body: body.substring(0, 80) };
      if (r.status === 200) {
        results.success = { method: name, data: JSON.parse(body) };
        break;
      }
    } catch(e) {
      results.auth_tests[name] = { error: e.message };
    }
  }

  // If env vars are set, test the live DB too
  if (url && key) {
    try {
      const r = await fetch(`${url}/rest/v1/eth_zone_metrics?select=count&limit=1`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
      });
      results.db_test = { status: r.status, body: (await r.text()).substring(0, 200) };
    } catch(e) { results.db_test = { error: e.message }; }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
