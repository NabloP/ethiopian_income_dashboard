import { useState, useEffect, useRef, useMemo } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { scaleQuantile } from 'd3-scale'
import { extent } from 'd3-array'
import { supabase, isConfigured } from './supabase'

/* ─── ECONOMIST PALETTE ────────────────────────────────────────
   The Economist: white/cream paper, almost-black ink, one red.
   Rules not boxes. Data-ink maximised. Red used once per screen.
──────────────────────────────────────────────────────────────── */
const C = {
  paper:  '#ffffff',
  tint:   '#f4f1eb',   // cream tint for controls/sidebar
  rule:   '#d5cfc4',   // hairline rule colour
  heavy:  '#1a1208',   // near-black ink
  mid:    '#4a4438',
  light:  '#8a8070',
  red:    '#e2001a',   // Economist red — used ONCE on page (active metric)
  redBg:  '#fff5f6',
  serif:  "'Noto Serif','Georgia',serif",
  sans:   "'Noto Sans','Helvetica Neue',system-ui,sans-serif",
  mono:   "'Noto Sans Mono','Courier New',monospace",
}

/* ─── METRICS ──────────────────────────────────────────────── */
const M = {
  income: {
    label: 'Per capita income',
    unit: 'ETB/yr',
    short: 'Income',
    fmt: v => `${Math.round(v).toLocaleString()} ETB`,
    mini: v => `${(v/1000).toFixed(1)}k`,
    // amber ramp: pale straw → deep terracotta
    ramp: ['#fef9e7','#fce8b0','#f8c86a','#f0a830','#e07820','#c04812','#8b2008'],
  },
  poverty: {
    label: 'Poverty headcount',
    unit: '% of pop.',
    short: 'Poverty',
    fmt: v => `${v.toFixed(1)}%`,
    mini: v => `${v.toFixed(0)}%`,
    // white → economist red
    ramp: ['#ffffff','#fde8eb','#f8bdc4','#f08090','#e04055','#cc1830','#98001a'],
  },
  hdi: {
    label: 'Human Dev. Index',
    unit: '0–1 score',
    short: 'HDI',
    fmt: v => v.toFixed(3),
    mini: v => v.toFixed(3),
    // pale mint → dark teal
    ramp: ['#f0f7f6','#c8e8e5','#94d0cb','#58b0a8','#2a8880','#006f6a','#004d48'],
  },
}

function colorScale(values, metric) {
  const ramp = M[metric].ramp
  const q = scaleQuantile().domain(values).range(ramp)
  return v => q(v)
}

/* ─── FALLBACK DATA ─────────────────────────────────────────── */
const REGION_BASE = {
  'Addis Ababa':{i:38000,p:18,h:.62},'Dire Dawa':{i:28000,p:28,h:.52},
  'Harari':{i:24000,p:32,h:.49},'Tigray':{i:14000,p:52,h:.42},
  'Amhara':{i:12000,p:58,h:.38},'Oromia':{i:13500,p:55,h:.40},
  'SNNPR':{i:11000,p:62,h:.37},'Somali':{i:9500,p:68,h:.33},
  'Benshangul-Gumuz':{i:10000,p:66,h:.35},'Gambella':{i:10500,p:64,h:.36},
  'Afar':{i:8500,p:72,h:.31},
}
const YEARS = [2015,2017,2019,2021,2023]

function prng(s) {
  let h=0; for (let i=0;i<String(s).length;i++) h=(Math.imul(31,h)+String(s).charCodeAt(i))|0
  return (h>>>0)/0xffffffff
}

function buildFallback(zones, metric, year) {
  const gf = 1+(year-2015)*0.055
  const map = {}
  for (const z of zones) {
    const b = REGION_BASE[z.region] ?? {i:11000,p:60,h:.38}
    const j = 0.8+prng(z.zone_code+year)*0.4
    let v
    if (metric==='income')        v = Math.round(b.i*gf*j)
    else if (metric==='poverty')  v = +((b.p*(1-(year-2015)*0.015)*j).toFixed(1))
    else                          v = +(((b.h+(year-2015)*0.008)*j).toFixed(3))
    map[z.zone_code] = v
  }
  return map
}

/* ─── SUPABASE FETCHERS ─────────────────────────────────────── */
async function fetchZones() {
  if (!isConfigured||!supabase) return null
  const {data,error} = await supabase.from('eth_zones').select('zone_code,zone_name,region,lat,lon').order('zone_code')
  if (error||!data?.length) return null
  return data
}

async function fetchValues(metric, year) {
  if (!isConfigured||!supabase) return null
  const {data,error} = await supabase.from('eth_zone_metrics').select('zone_code,value').eq('metric',metric).eq('year',year)
  if (error||!data?.length) return null
  return Object.fromEntries(data.map(r=>[r.zone_code,r.value]))
}

/* ─── SPARKLINE ─────────────────────────────────────────────── */
function Sparkline({values, color, w=88, h=26}) {
  const ref = useRef(null)
  useEffect(()=>{
    const c=ref.current; if(!c||!values?.length) return
    const dpr=window.devicePixelRatio||2
    c.width=w*dpr; c.height=h*dpr
    const ctx=c.getContext('2d'); ctx.scale(dpr,dpr)
    const lo=Math.min(...values), rng=Math.max(...values)-lo||1
    const pts=values.map((v,i)=>({x:i/(values.length-1)*w, y:h-3-((v-lo)/rng)*(h-7)}))
    ctx.beginPath()
    pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y))
    ctx.lineTo(pts.at(-1).x,h); ctx.lineTo(0,h); ctx.closePath()
    ctx.fillStyle=color+'1a'; ctx.fill()
    ctx.beginPath()
    pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y))
    ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.lineJoin='round'; ctx.stroke()
  },[values,color,w,h])
  return <canvas ref={ref} style={{width:w,height:h,display:'block'}}/>
}

/* ─── GLOBAL CSS ────────────────────────────────────────────── */
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%}
body{background:${C.paper};color:${C.heavy};font-family:${C.sans};overflow:hidden;font-size:13px}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:${C.tint}}::-webkit-scrollbar-thumb{background:${C.rule}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadein{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.fadein{animation:fadein .25s ease both}
button{font-family:${C.sans};cursor:pointer;outline:none}
.row{display:flex;align-items:center;gap:8px;padding:5px 14px;border-bottom:1px solid ${C.rule};cursor:pointer;transition:background .1s}
.row:hover{background:${C.tint}}
.row.sel{background:${C.redBg};border-left:3px solid ${C.red}}
`

/* ─── APP ───────────────────────────────────────────────────── */
export default function App() {
  const [geo,      setGeo]      = useState(null)
  const [zones,    setZones]    = useState([])     // [{zone_code,zone_name,region,lat,lon}]
  const [values,   setValues]   = useState({})     // {zone_code: number}
  const [metric,   setMetric]   = useState('income')
  const [year,     setYear]     = useState(2023)
  const [selected, setSelected] = useState(null)
  const [panel,    setPanel]    = useState('map')
  const [src,      setSrc]      = useState({geo:'…',data:'…'})
  const [rtLog,    setRtLog]    = useState([])
  const [flash,    setFlash]    = useState(null)
  const [rtLive,   setRtLive]   = useState(false)

  /* ── Load GeoJSON (bundled static asset — always works) ── */
  useEffect(()=>{
    fetch('/eth_zones.geojson')
      .then(r=>r.json())
      .then(gj=>{ setGeo(gj); setSrc(s=>({...s,geo:'bundled'})) })
      .catch(()=>setSrc(s=>({...s,geo:'error'})))
  },[])

  /* ── Load zones + values from Supabase (or fallback) ── */
  useEffect(()=>{
    let live=true
    async function load() {
      // Zones
      const dbZones = await fetchZones()
      const zList = dbZones ?? (geo?.features?.map(f=>({
        zone_code: f.properties.zone_code,
        zone_name: f.properties.zone_name,
        region:    f.properties.region,
        lat: 0, lon: 0,
      })) ?? [])
      if (live) setZones(zList)

      // Values
      const dbVals = await fetchValues(metric, year)
      if (live) {
        if (dbVals) {
          setValues(dbVals)
          setSrc(s=>({...s,data:'supabase'}))
        } else {
          setValues(buildFallback(zList.length?zList:FALLBACK_ZONES, metric, year))
          setSrc(s=>({...s,data:'built-in'}))
        }
      }
    }
    load()
    return ()=>{live=false}
  }, [metric, year, geo])

  /* ── Realtime subscription ── */
  useEffect(()=>{
    if (!isConfigured||!supabase) return
    const ch = supabase.channel('eth-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'eth_zone_metrics'},(payload)=>{
        const row=payload.new||payload.old; if(!row) return
        const now=new Date()
        const t=`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
        setRtLog(prev=>[{id:Date.now(),t,zc:row.zone_code,zn:zones.find(z=>z.zone_code===row.zone_code)?.zone_name||row.zone_code,val:row.value,metric:row.metric},...prev].slice(0,12))
        if (row.metric===metric && row.year===year) {
          setValues(prev=>({...prev,[row.zone_code]:row.value}))
          setFlash(row.zone_code)
          setTimeout(()=>setFlash(null),600)
        }
      })
      .subscribe(s=>setRtLive(s==='SUBSCRIBED'))
    return ()=>{ supabase.removeChannel(ch) }
  },[zones,metric,year])

  /* ── Derived ── */
  const domain  = useMemo(()=>Object.values(values).filter(Boolean),[values])
  const color   = useMemo(()=>domain.length?colorScale(domain,metric):()=>'#e8e0d0',[domain,metric])
  const sorted  = useMemo(()=>[...zones].sort((a,b)=>(values[b.zone_code]??0)-(values[a.zone_code]??0)),[zones,values])
  const avg     = domain.length ? domain.reduce((s,v)=>s+v,0)/domain.length : 0
  const selZ    = selected ? zones.find(z=>z.zone_code===selected) : null
  const selVal  = selected ? values[selected] : null
  const [lo,hi] = extent(domain.length?domain:[0,1])
  const m       = M[metric]

  // Fallback zones list for initial render before geo loads
  const FALLBACK_ZONES = zones.length ? zones : []

  /* ── Sparkline data for selected zone (all years, current metric) ── */
  const sparkData = useMemo(()=>{
    if (!selZ) return []
    return YEARS.map(y=>buildFallback([selZ], metric, y)[selZ.zone_code]).filter(Boolean)
  },[selZ,metric])

  return (
    <>
      <style>{CSS}</style>
      <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>

        {/* ══ TOP RED STRIPE + MASTHEAD ══════════════════════════ */}
        <div style={{background:C.red,height:5,flexShrink:0}}/>
        <header style={{borderBottom:`2px solid ${C.heavy}`,padding:'8px 20px 7px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,flexShrink:0}}>
          <div>
            <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.18em',color:C.light,marginBottom:3}}>
              Ethiopia · Zone-level Welfare Atlas
            </div>
            <h1 style={{fontFamily:C.serif,fontSize:'clamp(15px,1.75vw,21px)',fontWeight:700,letterSpacing:'-.025em',lineHeight:1.15}}>
              Income &amp; Human Development across Ethiopia's Administrative Zones
            </h1>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0,paddingBottom:2}}>
            {/* Live dot */}
            {rtLive && (
              <span style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:C.light}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#00a878',display:'inline-block',animation:'pulse 1.5s ease-in-out infinite'}}/>
                Live
              </span>
            )}
            <span style={{fontSize:10,color:C.light,fontFamily:C.mono}}>
              {src.data==='supabase'?'Supabase':src.data==='built-in'?'Built-in':'…'}
            </span>
          </div>
        </header>

        {/* ══ CONTROLS ═══════════════════════════════════════════ */}
        <div style={{background:C.tint,borderBottom:`1px solid ${C.rule}`,padding:'6px 20px',display:'flex',alignItems:'center',gap:16,flexShrink:0,flexWrap:'wrap'}}>
          {/* Metric selector */}
          <div style={{display:'flex'}}>
            {Object.entries(M).map(([k,mm],i,arr)=>{
              const on=k===metric
              return (
                <button key={k} onClick={()=>setMetric(k)} style={{
                  padding:'4px 13px', fontSize:11, fontWeight:on?600:400,
                  border:`1px solid ${on?C.red:C.rule}`,
                  borderRight: i<arr.length-1?'none':`1px solid ${on?C.red:C.rule}`,
                  borderRadius: i===0?'2px 0 0 2px':i===arr.length-1?'0 2px 2px 0':'0',
                  background: on?C.red:'transparent',
                  color: on?'#fff':C.mid,
                  transition:'all .15s',
                }}>{mm.short}</button>
              )
            })}
          </div>
          {/* Year selector */}
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.1em',color:C.light}}>Year</span>
            {YEARS.map(y=>{
              const on=y===year
              return (
                <button key={y} onClick={()=>setYear(y)} style={{
                  padding:'4px 9px', fontSize:11, fontFamily:C.mono,
                  border:`1px solid ${on?C.heavy:C.rule}`, borderRadius:2,
                  background:on?C.heavy:'transparent', color:on?'#fff':C.mid,
                  transition:'all .15s',
                }}>{y}</button>
              )
            })}
          </div>
          {/* View toggle */}
          <div style={{marginLeft:'auto',display:'flex',gap:6}}>
            {['map','ranking'].map(p=>{
              const on=p===panel
              return (
                <button key={p} onClick={()=>setPanel(p)} style={{
                  padding:'4px 11px', fontSize:11,
                  border:`1px solid ${on?C.heavy:C.rule}`, borderRadius:2,
                  background:on?C.heavy:'transparent', color:on?'#fff':C.mid,
                  textTransform:'capitalize', transition:'all .15s',
                }}>{p}</button>
              )
            })}
          </div>
        </div>

        {/* ══ KPI STRIP ══════════════════════════════════════════ */}
        <div style={{display:'flex',borderBottom:`1px solid ${C.rule}`,flexShrink:0,overflowX:'auto'}}>
          {[
            {label:'National avg.', val:domain.length?m.fmt(avg):'—', sub:m.unit},
            {label:'Highest zone',  val:sorted[0]?m.mini(values[sorted[0].zone_code]):'—', sub:sorted[0]?.zone_name??''},
            {label:'Lowest zone',   val:sorted.at(-1)?m.mini(values[sorted.at(-1).zone_code]):'—', sub:sorted.at(-1)?.zone_name??''},
            {label:'Zones',         val:zones.length||'—', sub:'ADM2 units'},
          ].map((k,i)=>(
            <div key={i} style={{flex:1,minWidth:100,padding:'9px 18px',borderRight:`1px solid ${C.rule}`}}>
              <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.14em',color:C.light}}>{k.label}</div>
              <div style={{fontFamily:C.serif,fontSize:20,fontWeight:700,color:C.red,lineHeight:1.2,marginTop:1}}>{k.val}</div>
              <div style={{fontSize:10,color:C.light,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ══ BODY ════════════════════════════════════════════════ */}
        <div style={{display:'flex',flex:1,overflow:'hidden',minHeight:0}}>

          {/* MAP / RANKING */}
          <div style={{flex:1,position:'relative',overflow:'hidden'}}>
            {panel==='map' && (
              !geo
                ? <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,color:C.light}}>
                    <div style={{width:16,height:16,border:`1.5px solid ${C.rule}`,borderTop:`1.5px solid ${C.red}`,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
                    Loading map…
                  </div>
                : <ComposableMap projection="geoMercator"
                    projectionConfig={{center:[39.5,9.0],scale:2100}}
                    style={{width:'100%',height:'100%',background:C.paper}}>
                    <ZoomableGroup center={[39.5,9.0]} zoom={1} minZoom={0.5} maxZoom={16}>
                      <Geographies geography={geo}>
                        {({geographies})=>geographies.map(geo=>{
                          const zc  = geo.properties.zone_code
                          const val = values[zc]
                          const sel = selected===zc
                          const fl  = flash===zc
                          return (
                            <Geography key={zc} geography={geo}
                              fill={val!=null?color(val):'#ece7dc'}
                              stroke={sel?C.heavy:C.paper}
                              strokeWidth={sel?1.5:.4}
                              style={{
                                default:{outline:'none',opacity:fl?.6:sel?1:.88,filter:sel?'brightness(.9)':'none'},
                                hover:  {outline:'none',cursor:'pointer',opacity:1,stroke:C.mid,strokeWidth:.8,filter:'brightness(.85)'},
                                pressed:{outline:'none'},
                              }}
                              onClick={()=>setSelected(sel?null:zc)}
                            />
                          )
                        })}
                      </Geographies>
                    </ZoomableGroup>
                  </ComposableMap>
            )}
            {panel==='ranking' && (
              <div style={{height:'100%',overflowY:'auto'}}>
                <div style={{display:'flex',padding:'6px 14px',borderBottom:`2px solid ${C.heavy}`,position:'sticky',top:0,background:C.paper,zIndex:1}}>
                  <span style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',color:C.light,width:22}}>#</span>
                  <span style={{flex:1,fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',color:C.light,paddingLeft:8}}>Zone</span>
                  <span style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',color:C.light,width:80,textAlign:'right'}}>{m.short}</span>
                </div>
                {sorted.map((z,i)=>{
                  const val=values[z.zone_code]
                  const sel=selected===z.zone_code
                  return (
                    <div key={z.zone_code} className={`row${sel?' sel':''}`}
                      onClick={()=>setSelected(sel?null:z.zone_code)}>
                      <span style={{fontFamily:C.mono,fontSize:9,color:C.light,width:18,textAlign:'right',flexShrink:0}}>{i+1}</span>
                      <div style={{flex:1,paddingLeft:8,minWidth:0}}>
                        <div style={{fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{z.zone_name}</div>
                        <div style={{marginTop:2,height:2,background:C.rule,borderRadius:1}}>
                          <div style={{height:'100%',width:`${val&&hi?(val/hi)*100:0}%`,background:sel?C.red:C.mid,borderRadius:1,transition:'width .3s'}}/>
                        </div>
                      </div>
                      <span style={{fontFamily:C.mono,fontSize:10,color:sel?C.red:C.heavy,width:76,textAlign:'right',flexShrink:0}}>
                        {val!=null?m.mini(val):'—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            {/* Map footer */}
            {panel==='map' && geo && (
              <div style={{position:'absolute',bottom:6,left:8,fontSize:8,color:C.light,fontFamily:C.mono,background:'rgba(255,255,255,.85)',padding:'2px 5px',borderRadius:1}}>
                Boundaries: approximate ADM2 · scroll/pinch to zoom
              </div>
            )}
          </div>

          {/* ══ SIDEBAR ═════════════════════════════════════════ */}
          <div style={{width:240,flexShrink:0,borderLeft:`1px solid ${C.rule}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>

            {/* Legend */}
            <div style={{padding:'11px 14px 10px',borderBottom:`1px solid ${C.rule}`}}>
              <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.12em',color:C.light,marginBottom:6}}>{m.label}</div>
              <div style={{display:'flex',height:8,borderRadius:1,overflow:'hidden',marginBottom:4}}>
                {m.ramp.map((c,i)=><div key={i} style={{flex:1,background:c}}/>)}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:9,fontFamily:C.mono,color:C.light}}>
                <span>{domain.length?m.mini(lo):'—'}</span>
                <span>{domain.length?m.mini(hi):'—'}</span>
              </div>
            </div>

            {/* Tabs */}
            <div style={{display:'flex',borderBottom:`1px solid ${C.rule}`,flexShrink:0}}>
              {['Zone','Overview'].map((t,i)=>{
                const active=i===0?!!selZ:!selZ
                return (
                  <button key={t} onClick={()=>i===1&&setSelected(null)}
                    disabled={i===0&&!selZ}
                    style={{flex:1,padding:'6px',fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',background:'transparent',border:'none',color:active?C.heavy:C.light,borderBottom:`2px solid ${active?C.red:'transparent'}`,cursor:i===0&&!selZ?'default':'pointer',transition:'all .12s'}}>
                    {t}
                  </button>
                )
              })}
            </div>

            {/* Zone detail / overview */}
            <div style={{flex:1,overflowY:'auto',minHeight:0}}>
              {selZ ? (
                <div className="fadein" style={{padding:'12px 14px'}}>
                  <div style={{borderBottom:`2px solid ${C.heavy}`,paddingBottom:8,marginBottom:10}}>
                    <div style={{fontFamily:C.serif,fontSize:16,fontWeight:700,lineHeight:1.2}}>{selZ.zone_name}</div>
                    <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',color:C.light,marginTop:3}}>{selZ.region}</div>
                  </div>
                  {/* Primary metric value */}
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',color:C.light,marginBottom:3}}>{m.label}, {year}</div>
                    <div style={{fontFamily:C.serif,fontSize:26,fontWeight:700,color:C.red,lineHeight:1,letterSpacing:'-.02em'}}>
                      {selVal!=null?m.fmt(selVal):'—'}
                    </div>
                  </div>
                  {/* Trend sparkline */}
                  <div style={{marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:8,color:C.light,fontFamily:C.mono,marginBottom:2}}>
                      <span>2015</span><span>Trend</span><span>2023</span>
                    </div>
                    <Sparkline values={sparkData} color={C.red} w={100} h={28}/>
                  </div>
                  {/* All 3 metrics */}
                  <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',color:C.light,marginBottom:6,borderTop:`1px solid ${C.rule}`,paddingTop:8}}>
                    All indicators, {year}
                  </div>
                  {Object.entries(M).map(([mk,mm])=>{
                    const v = values[selZ.zone_code]
                    const isA = mk===metric
                    const fbv = buildFallback([selZ],mk,year)[selZ.zone_code]
                    return (
                      <div key={mk} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:`1px solid ${C.rule}`}}>
                        <span style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.08em',color:isA?C.red:C.light}}>{mm.short}</span>
                        <span style={{fontFamily:C.mono,fontSize:11,fontWeight:isA?700:400,color:isA?C.red:C.heavy}}>
                          {fbv!=null?mm.mini(fbv):'—'}
                        </span>
                      </div>
                    )
                  })}
                  <div style={{marginTop:8,fontSize:8,color:C.light,fontFamily:C.mono}}>{selZ.zone_code}</div>
                </div>
              ) : (
                <div style={{padding:'18px 14px',color:C.light,fontSize:11,lineHeight:1.8,textAlign:'center',paddingTop:32}}>
                  <div style={{fontSize:24,marginBottom:10,color:C.rule}}>◻</div>
                  Click a zone on the map or from the ranking to see details
                </div>
              )}
            </div>

            {/* Realtime feed */}
            {rtLog.length>0 && (
              <div style={{borderTop:`1px solid ${C.rule}`,padding:'7px 14px',maxHeight:120,overflowY:'auto',flexShrink:0,background:C.tint}}>
                <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'.12em',color:C.red,marginBottom:5,display:'flex',alignItems:'center',gap:5}}>
                  <span style={{width:5,height:5,borderRadius:'50%',background:C.red,display:'inline-block',animation:'pulse 1.5s ease-in-out infinite'}}/>
                  Live updates
                </div>
                {rtLog.slice(0,6).map((ev,i)=>(
                  <div key={ev.id} style={{fontFamily:C.mono,fontSize:9,display:'flex',gap:7,padding:'2px 0',borderBottom:`1px solid ${C.rule}`,color:i===0?C.heavy:C.light,opacity:1-i*.12}}>
                    <span style={{color:C.light,flexShrink:0}}>{ev.t}</span>
                    <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.zn}</span>
                    <span style={{flexShrink:0,color:i===0?C.red:C.light}}>{ev.val!=null?M[ev.metric]?.mini(ev.val):'—'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div style={{padding:'6px 14px',borderTop:`1px solid ${C.rule}`,fontSize:8,color:C.light,lineHeight:1.8,flexShrink:0}}>
              Sources: CSA HCES · World Bank 2020 · IFPRI<br/>
              DB: <code>eth_zones</code> + <code>eth_zone_metrics</code> · Supabase
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
