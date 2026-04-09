export const config = { runtime: 'edge' };

export default async function handler(req) {
  const PAT = 'sbp_355deee83d82301914b40ea637b2444974b64163';
  
  // List projects
  const projRes = await fetch('https://api.supabase.com/v1/projects', {
    headers: { 'Authorization': `Bearer ${PAT}` }
  });
  const projects = await projRes.json();
  
  if (!Array.isArray(projects) || projects.length === 0) {
    return new Response(JSON.stringify({ error: 'No projects', raw: projects }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Get API keys for each project
  const results = await Promise.all(projects.map(async (p) => {
    const keysRes = await fetch(`https://api.supabase.com/v1/projects/${p.ref}/api-keys`, {
      headers: { 'Authorization': `Bearer ${PAT}` }
    });
    const keys = await keysRes.json();
    const anonKey = Array.isArray(keys) ? keys.find(k => k.name === 'anon' && !k.name.includes('service')) : null;
    return {
      name: p.name,
      ref: p.ref,
      region: p.region,
      status: p.status,
      url: `https://${p.ref}.supabase.co`,
      anon_key: anonKey?.api_key ?? null,
    };
  }));
  
  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
