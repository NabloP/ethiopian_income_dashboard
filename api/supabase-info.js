export const config = { runtime: 'edge' };

export default async function handler(req) {
  const PAT = 'sbp_355deee83d82301914b40ea637b2444974b64163';
  
  // Try 1: Standard Bearer
  const r1 = await fetch('https://api.supabase.com/v1/projects', {
    headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' }
  });
  const t1 = await r1.text();

  // Try 2: As apikey header  
  const r2 = await fetch('https://api.supabase.com/v1/projects', {
    headers: { 'apikey': PAT, 'Content-Type': 'application/json' }
  });
  const t2 = await r2.text();

  // Try 3: Check if this is a service_role key format (JWT) vs PAT
  // PATs start with sbp_, JWTs start with eyJ
  const tokenType = PAT.startsWith('sbp_') ? 'PAT' : PAT.startsWith('eyJ') ? 'JWT' : 'unknown';
  
  // Try 4: v2 endpoint
  const r4 = await fetch('https://api.supabase.com/v2/projects', {
    headers: { 'Authorization': `Bearer ${PAT}` }
  });
  const t4 = await r4.text();

  return new Response(JSON.stringify({
    tokenType,
    tokenPrefix: PAT.substring(0, 12),
    r1_status: r1.status,
    r1_body: t1.substring(0, 200),
    r2_status: r2.status,
    r2_body: t2.substring(0, 200),
    r4_status: r4.status,
    r4_body: t4.substring(0, 200),
  }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}
