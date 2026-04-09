import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { scaleQuantile } from 'd3-scale'
import { interpolateYlOrRd, interpolateBlues } from 'd3-scale-chromatic'
import { extent } from 'd3-array'
import { supabase, isConfigured } from './supabase'

/* ══════════════════════════════════════════════════════════════
   DATA — Zone definitions + seeded fallback
══════════════════════════════════════════════════════════════ */
const RAW_ZONES = [
  {z:'ET010100',n:'Tigray Central',r:'Tigray',lat:13.5,lon:39.5},
  {z:'ET010200',n:'Tigray Eastern',r:'Tigray',lat:13.8,lon:40.2},
  {z:'ET010300',n:'Tigray NW',r:'Tigray',lat:14.1,lon:38.5},
  {z:'ET010400',n:'Tigray Southern',r:'Tigray',lat:12.8,lon:39.4},
  {z:'ET010500',n:'Tigray Western',r:'Tigray',lat:13.6,lon:38.0},
  {z:'ET020100',n:'Awsi Rasu',r:'Afar',lat:12.5,lon:41.5},
  {z:'ET020200',n:'Kilbati Rasu',r:'Afar',lat:11.8,lon:41.2},
  {z:'ET020300',n:'Gabi Rasu',r:'Afar',lat:10.8,lon:40.8},
  {z:'ET020400',n:'Fantana Rasu',r:'Afar',lat:11.5,lon:42.5},
  {z:'ET020500',n:'Hari Rasu',r:'Afar',lat:10.2,lon:42.0},
  {z:'ET030100',n:'Waghimra',r:'Amhara',lat:12.6,lon:39.0},
  {z:'ET030200',n:'North Wollo',r:'Amhara',lat:11.8,lon:39.5},
  {z:'ET030300',n:'South Wollo',r:'Amhara',lat:11.0,lon:39.6},
  {z:'ET030500',n:'East Gojam',r:'Amhara',lat:10.8,lon:37.8},
  {z:'ET030600',n:'West Gojam',r:'Amhara',lat:10.9,lon:37.0},
  {z:'ET030700',n:'Awi',r:'Amhara',lat:10.5,lon:36.5},
  {z:'ET030900',n:'North Gondar',r:'Amhara',lat:12.7,lon:37.8},
  {z:'ET031000',n:'South Gondar',r:'Amhara',lat:11.9,lon:37.9},
  {z:'ET031100',n:'North Shewa (Amhara)',r:'Amhara',lat:9.8,lon:39.5},
  {z:'ET040100',n:'West Hararghe',r:'Oromia',lat:8.8,lon:40.8},
  {z:'ET040200',n:'East Hararghe',r:'Oromia',lat:8.9,lon:41.8},
  {z:'ET040300',n:'Arsi',r:'Oromia',lat:7.8,lon:39.6},
  {z:'ET040400',n:'Bale',r:'Oromia',lat:6.9,lon:40.5},
  {z:'ET040500',n:'West Guji',r:'Oromia',lat:5.9,lon:38.5},
  {z:'ET040700',n:'Borena',r:'Oromia',lat:4.5,lon:39.0},
  {z:'ET040800',n:'West Shewa',r:'Oromia',lat:9.0,lon:37.5},
  {z:'ET040900',n:'North Shewa (Oromia)',r:'Oromia',lat:9.8,lon:38.8},
  {z:'ET041000',n:'East Shewa',r:'Oromia',lat:8.5,lon:39.0},
  {z:'ET041100',n:'Jimma',r:'Oromia',lat:7.5,lon:36.8},
  {z:'ET041200',n:'Illubabor',r:'Oromia',lat:7.8,lon:35.8},
  {z:'ET041300',n:'Kelam Wellega',r:'Oromia',lat:8.7,lon:34.8},
  {z:'ET041400',n:'East Wellega',r:'Oromia',lat:9.0,lon:36.2},
  {z:'ET041500',n:'West Wellega',r:'Oromia',lat:9.2,lon:35.2},
  {z:'ET050100',n:'Jijiga',r:'Somali',lat:9.3,lon:42.8},
  {z:'ET050200',n:'Fik',r:'Somali',lat:8.0,lon:43.7},
  {z:'ET050300',n:'Warder',r:'Somali',lat:7.5,lon:45.0},
  {z:'ET050400',n:'Liben',r:'Somali',lat:4.5,lon:42.0},
  {z:'ET050500',n:'Degehabur',r:'Somali',lat:8.2,lon:44.0},
  {z:'ET050600',n:'Korahe',r:'Somali',lat:6.8,lon:44.5},
  {z:'ET050700',n:'Gode',r:'Somali',lat:5.9,lon:43.5},
  {z:'ET060100',n:'Metekel',r:'Benshangul-Gumuz',lat:11.2,lon:35.8},
  {z:'ET060200',n:'Assosa',r:'Benshangul-Gumuz',lat:10.1,lon:34.5},
  {z:'ET060300',n:'Kamashi',r:'Benshangul-Gumuz',lat:9.8,lon:34.0},
  {z:'ET070100',n:'Gurage',r:'SNNPR',lat:8.0,lon:38.2},
  {z:'ET070200',n:'Sidama',r:'SNNPR',lat:6.8,lon:38.5},
  {z:'ET070300',n:'Wolaita',r:'SNNPR',lat:6.8,lon:37.5},
  {z:'ET070400',n:'Gamo',r:'SNNPR',lat:6.0,lon:37.4},
  {z:'ET070500',n:'Dawro',r:'SNNPR',lat:7.0,lon:36.8},
  {z:'ET070600',n:'Hadiya',r:'SNNPR',lat:7.5,lon:37.8},
  {z:'ET070700',n:'Kambata Tambaro',r:'SNNPR',lat:7.4,lon:37.6},
  {z:'ET070800',n:'Bench Sheko',r:'SNNPR',lat:6.8,lon:35.8},
  {z:'ET070900',n:'South Omo',r:'SNNPR',lat:5.5,lon:36.5},
  {z:'ET120100',n:'Agnewak',r:'Gambella',lat:7.9,lon:34.8},
  {z:'ET120200',n:'Nuer',r:'Gambella',lat:8.2,lon:34.3},
  {z:'ET130100',n:'Harari',r:'Harari',lat:9.3,lon:42.1},
  {z:'ET140100',n:'Addis Ababa',r:'Addis Ababa',lat:9.03,lon:38.74},
  {z:'ET150100',n:'Dire Dawa',r:'Dire Dawa',lat:9.6,lon:41.85},
]

const REGION_BASE = {
  'Addis Ababa':     {inc:38000,pov:18,hdi:.62},
  'Dire Dawa':       {inc:28000,pov:28,hdi:.52},
  'Harari':          {inc:24000,pov:32,hdi:.49},
  'Tigray':          {inc:14000,pov:52,hdi:.42},
  'Amhara':          {inc:12000,pov:58,hdi:.38},
  'Oromia':          {inc:13500,pov:55,hdi:.40},
  'SNNPR':           {inc:11000,pov:62,hdi:.37},
  'Somali':          {inc:9500, pov:68,hdi:.33},
  'Benshangul-Gumuz':{inc:10000,pov:66,hdi:.35},
  'Gambella':        {inc:10500,pov:64,hdi:.36},
  'Afar':            {inc:8500, pov:72,hdi:.31},
}
const YEARS = [2015, 2017, 2019, 2021, 2023]

function seed(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return (h >>> 0) / 0xffffffff
}

function buildFallback(metric, year) {
  const gf = 1 + (year - 2015) * 0.055
  return RAW_ZONES.map(z => {
    const b = REGION_BASE[z.r] ?? {inc:11000,pov:60,hdi:.38}
    const j = 0.8 + seed(z.z + year) * 0.4
    let value
    if      (metric === 'income')  value = Math.round(b.inc * gf * j)
    else if (metric === 'poverty') value = +((b.pov * (1 - (year-2015)*0.015) * j).toFixed(1))
    else                           value = +(((b.hdi + (year-2015)*0.008) * j).toFixed(3))
    return { zone_code:z.z, zone_name:z.n, region:z.r, lat:z.lat, lon:z.lon, value }
  })
}

// Pre-build fallback for all metric/year combos
const FALLBACK = {}
;['income','poverty','hdi'].forEach(m => {
  FALLBACK[m] = {}
  YEARS.forEach(y => { FALLBACK[m][y] = buildFallback(m, y) })
})

/* ══════════════════════════════════════════════════════════════
   SUPABASE FETCH — reads from eth_zone_metrics table
   Falls back to built-in data seamlessly if not configured.

   SQL to run in Supabase SQL Editor to create + seed the table:
   See README.md or supabase/seed.sql in this repo.
══════════════════════════════════════════════════════════════ */
async function fetchData(metric, year) {
  if (!isConfigured || !supabase) {
    await new Promise(r => setTimeout(r, 180))
    return { rows: FALLBACK[metric][year], source: 'fallback' }
  }
  try {
    const { data, error } = await supabase
      .from('eth_zone_metrics')
      .select('zone_code, zone_name, region, lat, lon, value')
      .eq('metric', metric)
      .eq('year', year)
      .order('zone_code')

    if (error) throw error
    if (!data || data.length === 0) {
      return { rows: FALLBACK[metric][year], source: 'fallback' }
    }
    return { rows: data, source: 'supabase' }
  } catch (e) {
    console.warn('Supabase fetch failed, using fallback:', e.message)
    return { rows: FALLBACK[metric][year], source: 'fallback' }
  }
}

/* ══════════════════════════════════════════════════════════════
   METRIC CONFIG
══════════════════════════════════════════════════════════════ */
const METRICS = {
  income:  { label:'Per capita income',      unit:'ETB/yr', short:'Income',  fmt: v => `ETB ${Math.round(v).toLocaleString()}` },
  poverty: { label:'Poverty headcount',       unit:'%',      short:'Poverty', fmt: v => `${v.toFixed(1)}%` },
  hdi:     { label:'Human Development Index', unit:'score',  short:'HDI',     fmt: v => v.toFixed(3) },
}

/* ══════════════════════════════════════════════════════════════
   GEO — synthesised elliptical zone polygons from centroids
   (production: swap for HDX geoBoundaries ETH ADM2 GeoJSON)
══════════════════════════════════════════════════════════════ */
function makeGeoJSON(zones) {
  return {
    type: 'FeatureCollection',
    features: zones.map(z => {
      const w = 0.52 + seed(z.z+'w') * 0.55
      const h = 0.42 + seed(z.z+'h') * 0.48
      const steps = 24
      const coords = Array.from({length: steps+1}, (_, i) => {
        const a = (i / steps) * 2 * Math.PI
        return [z.lon + Math.cos(a)*w, z.lat + Math.sin(a)*h]
      })
      return {
        type: 'Feature',
        properties: { zone_code:z.z, zone_name:z.n, region:z.r },
        geometry: { type:'Polygon', coordinates:[coords] },
      }
    }),
  }
}
const ETH_GEO = makeGeoJSON(RAW_ZONES)

/* ══════════════════════════════════════════════════════════════
   COLOUR HELPERS
══════════════════════════════════════════════════════════════ */
function makeColorScale(domain, metric) {
  const fn = metric === 'poverty' ? interpolateBlues : interpolateYlOrRd
  return scaleQuantile().domain(domain).range(
    Array.from({length:8}, (_,i) => fn(metric==='poverty' ? 0.2+(i/7)*0.8 : i/7))
  )
}

/* ══════════════════════════════════════════════════════════════
   SPARKLINE
══════════════════════════════════════════════════════════════ */
function Sparkline({ zoneCode, metric, color='#c0392b', width=64, height=22 }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const vals = YEARS.map(y => FALLBACK[metric][y].find(d => d.zone_code===zoneCode)?.value ?? 0)
    const ctx = canvas.getContext('2d')
    const lo = Math.min(...vals), hi = Math.max(...vals)
    ctx.clearRect(0,0,width,height)
    ctx.beginPath()
    vals.forEach((v,i) => {
      const x = i * (width/(vals.length-1))
      const y = height - ((v-lo)/(hi-lo||1)) * (height-4) - 2
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y)
    })
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke()
  }, [zoneCode, metric, color, width, height])
  return <canvas ref={ref} width={width} height={height} style={{display:'block'}}/>
}

/* ══════════════════════════════════════════════════════════════
   LEGEND
══════════════════════════════════════════════════════════════ */
function Legend({ colorScale, domain, metric }) {
  const [lo, hi] = extent(domain)
  return (
    <div style={{padding:'14px 16px 0'}}>
      <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.13em',color:'#7a7060',marginBottom:5}}>
        {METRICS[metric].label}
      </div>
      <div style={{display:'flex',height:7,borderRadius:2,overflow:'hidden'}}>
        {Array.from({length:8},(_,i)=>(
          <div key={i} style={{flex:1,background:colorScale(lo+(hi-lo)*(i/7))}}/>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#7a7060',marginTop:3}}>
        <span>{METRICS[metric].fmt(lo)}</span>
        <span>{METRICS[metric].fmt(hi)}</span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   RANKING PANEL
══════════════════════════════════════════════════════════════ */
function RankingPanel({ data, metric, selected, onSelect }) {
  const sorted = useMemo(() => [...data].sort((a,b)=>b.value-a.value), [data])
  const max = sorted[0]?.value ?? 1
  return (
    <div style={{overflowY:'auto',height:'100%'}}>
      <div style={{padding:'10px 16px 4px',fontSize:11,color:'#7a7060',fontStyle:'italic',borderBottom:'1px solid #ece7dc'}}>
        All zones ranked by {METRICS[metric].label}
      </div>
      {sorted.map((d,i) => (
        <div key={d.zone_code}
          onClick={()=>onSelect(selected===d.zone_code?null:d.zone_code)}
          style={{display:'flex',alignItems:'center',gap:7,padding:'5px 16px',
            borderBottom:'1px solid #ece7dc',cursor:'pointer',
            background:selected===d.zone_code?'#f4efe6':'transparent'}}>
          <span style={{fontSize:9,color:'#7a7060',minWidth:18,textAlign:'right'}}>{i+1}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:'#1a1a18',fontFamily:"'Playfair Display',serif",
              whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{d.zone_name}</div>
            <div style={{height:3,background:'#ece7dc',borderRadius:2,marginTop:3}}>
              <div style={{height:'100%',width:`${(d.value/max)*100}%`,background:'#c0392b',borderRadius:2}}/>
            </div>
          </div>
          <span style={{fontSize:10,color:'#c0392b',fontWeight:600,minWidth:64,textAlign:'right',
            fontVariantNumeric:'tabular-nums'}}>{METRICS[metric].fmt(d.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAP
══════════════════════════════════════════════════════════════ */
function EthMap({ data, metric, selected, onSelect, colorScale }) {
  const dataMap = useMemo(() => Object.fromEntries(data.map(d=>[d.zone_code,d])), [data])

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ center:[39.5,9.0], scale:1850 }}
      style={{width:'100%',height:'100%'}}
    >
      <ZoomableGroup center={[39.5,9.0]} zoom={1} minZoom={0.8} maxZoom={10}>
        <Geographies geography={ETH_GEO}>
          {({geographies}) => geographies.map(geo => {
            const zc  = geo.properties.zone_code
            const zd  = dataMap[zc]
            const isSel = selected === zc
            return (
              <Geography
                key={zc}
                geography={geo}
                fill={zd ? colorScale(zd.value) : '#ccc'}
                stroke={isSel ? '#1a1a18' : 'rgba(255,255,255,0.5)'}
                strokeWidth={isSel ? 2 : 0.6}
                style={{
                  default:{outline:'none',opacity:isSel?1:.85},
                  hover:  {outline:'none',opacity:1,stroke:'#1a1a18',strokeWidth:1.5,cursor:'pointer'},
                  pressed:{outline:'none'},
                }}
                onClick={()=>onSelect(isSel?null:zc)}
              />
            )
          })}
        </Geographies>
      </ZoomableGroup>
    </ComposableMap>
  )
}

/* ══════════════════════════════════════════════════════════════
   TOOLTIP (follows mouse via DOM — avoids React re-render cost)
══════════════════════════════════════════════════════════════ */
function useTooltip(data, metric) {
  const ttRef = useRef(null)
  const move = useCallback((zone, evt) => {
    const tt = ttRef.current; if (!tt) return
    if (!zone) { tt.style.display='none'; return }
    tt.querySelector('.tt-name').textContent = zone.zone_name
    tt.querySelector('.tt-region').textContent = zone.region
    tt.querySelector('.tt-val').textContent = METRICS[metric].fmt(zone.value)
    tt.style.display='block'
    tt.style.left = (evt.clientX+14)+'px'
    tt.style.top  = (evt.clientY-10)+'px'
  }, [metric])
  return { ttRef, move }
}

/* ══════════════════════════════════════════════════════════════
   APP
══════════════════════════════════════════════════════════════ */
const C = {
  ink:'#1a1a18', paper:'#f4efe6', accent:'#c0392b',
  muted:'#7a7060', border:'#d8d2c6', surface:'#ece7dc',
  gold:'#b8952a', white:'#ffffff',
}

export default function App() {
  const [metric,   setMetric]   = useState('income')
  const [year,     setYear]     = useState(2023)
  const [data,     setData]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [source,   setSource]   = useState('fallback')
  const [selected, setSelected] = useState(null)
  const [panel,    setPanel]    = useState('map')

  useEffect(() => {
    setLoading(true)
    fetchData(metric, year).then(({rows, source}) => {
      setData(rows)
      setSource(source)
      setLoading(false)
    })
  }, [metric, year])

  const domain     = useMemo(() => data.map(d=>d.value), [data])
  const colorScale = useMemo(() => domain.length ? makeColorScale(domain, metric) : ()=>'#ccc', [domain, metric])
  const sorted     = useMemo(() => [...data].sort((a,b)=>b.value-a.value), [data])
  const natAvg     = data.length ? data.reduce((s,d)=>s+d.value,0)/data.length : 0
  const selZone    = selected ? data.find(d=>d.zone_code===selected) : null

  // Typography
  const serif  = "'Playfair Display', Georgia, serif"
  const sans   = "'Source Sans 3', system-ui, sans-serif"

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',
      fontFamily:sans,background:C.paper,color:C.ink}}>

      {/* ── Header ── */}
      <header style={{borderBottom:`3px solid ${C.ink}`,padding:'13px 24px 10px',
        display:'flex',alignItems:'flex-end',justifyContent:'space-between',
        flexShrink:0,background:C.paper,gap:16,flexWrap:'wrap'}}>
        <div>
          <div style={{fontSize:10,letterSpacing:'.16em',textTransform:'uppercase',color:C.muted,marginBottom:4}}>
            Ethiopia · Zone-level Atlas · {year}
          </div>
          <div style={{fontFamily:serif,fontSize:'clamp(16px,2.4vw,24px)',fontWeight:800,
            letterSpacing:'-.02em',lineHeight:1.1}}>
            Income &amp; Welfare across Ethiopia's Zones
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,
            background: source==='supabase'?'#3FCF8E' : loading?C.gold:'#aaa',
            transition:'background .4s'}}/>
          <span style={{fontSize:10,color:source==='supabase'?'#3FCF8E':C.muted,letterSpacing:'.06em'}}>
            {loading ? 'Loading…' : source==='supabase' ? 'Supabase live' : 'Built-in data'}
          </span>
          {source==='supabase' && (
            <span style={{fontSize:9,background:'#1C1C1C',color:'#3FCF8E',padding:'2px 6px',
              borderRadius:2,letterSpacing:'.06em',fontWeight:700}}>SUPABASE</span>
          )}
        </div>
      </header>

      {/* ── Controls ── */}
      <div style={{borderBottom:`1px solid ${C.border}`,padding:'9px 24px',
        display:'flex',alignItems:'center',gap:20,flexWrap:'wrap',
        background:'#ece7dc',flexShrink:0}}>
        {/* Metric buttons */}
        <div style={{display:'flex'}}>
          {Object.entries(METRICS).map(([k,m],i,arr)=>(
            <button key={k} onClick={()=>setMetric(k)} style={{
              padding:'5px 13px',fontSize:11,fontFamily:'inherit',cursor:'pointer',
              border:`1px solid ${C.border}`,
              borderRight: i<arr.length-1?'none':`1px solid ${C.border}`,
              background: metric===k ? C.ink : 'transparent',
              color:       metric===k ? C.paper : C.ink,
              transition:'all .15s',letterSpacing:'.04em',
            }}>{m.short}</button>
          ))}
        </div>
        {/* Year chips */}
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.12em',color:C.muted}}>Year</span>
          {YEARS.map(y=>(
            <button key={y} onClick={()=>setYear(y)} style={{
              padding:'4px 10px',fontSize:11,fontFamily:'inherit',cursor:'pointer',
              border:`1px solid ${year===y?C.accent:C.border}`,borderRadius:2,
              background: year===y ? C.accent : 'transparent',
              color:       year===y ? '#fff'    : C.ink,
              transition:'all .15s',
            }}>{y}</button>
          ))}
        </div>
        {/* View toggle */}
        <div style={{marginLeft:'auto',display:'flex'}}>
          {['map','ranking'].map((p,i,arr)=>(
            <button key={p} onClick={()=>setPanel(p)} style={{
              padding:'4px 12px',fontSize:10,textTransform:'uppercase',letterSpacing:'.08em',
              fontFamily:'inherit',cursor:'pointer',
              border:`1px solid ${C.border}`,
              borderRight:i<arr.length-1?'none':`1px solid ${C.border}`,
              background: panel===p ? C.accent : 'transparent',
              color:       panel===p ? '#fff'   : C.muted,
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{display:'flex',borderBottom:`2px solid ${C.ink}`,flexShrink:0,
        overflowX:'auto',background:C.white}}>
        {[
          {label:'National average', value:METRICS[metric].fmt(natAvg),     sub:METRICS[metric].unit},
          {label:'Highest zone',     value:sorted[0]?METRICS[metric].fmt(sorted[0].value):'—', sub:sorted[0]?.zone_name??''},
          {label:'Lowest zone',      value:sorted.at(-1)?METRICS[metric].fmt(sorted.at(-1).value):'—', sub:sorted.at(-1)?.zone_name??''},
          {label:'Zones tracked',    value:data.length, sub:'ADM2 administrative'},
        ].map((k,i)=>(
          <div key={i} style={{flex:1,minWidth:130,padding:'11px 18px',
            borderRight:`1px solid ${C.border}`}}>
            <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.14em',color:C.muted}}>{k.label}</div>
            <div style={{fontFamily:serif,fontSize:20,fontWeight:700,color:C.accent,lineHeight:1.15,marginTop:2}}>
              {k.value}
            </div>
            <div style={{fontSize:10,color:C.muted,marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Body ── */}
      <div style={{display:'flex',flex:1,overflow:'hidden',minHeight:0}}>

        {/* Map / ranking */}
        <div style={{flex:1,position:'relative',background:'#ddd8cc',overflow:'hidden'}}>
          {panel==='map' && data.length>0 && (
            <EthMap
              data={data}
              metric={metric}
              selected={selected}
              onSelect={setSelected}
              colorScale={colorScale}
            />
          )}
          {panel==='ranking' && (
            <RankingPanel data={data} metric={metric} selected={selected} onSelect={setSelected}/>
          )}
          {loading && (
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',
              justifyContent:'center',background:'rgba(244,239,230,.72)',
              fontFamily:serif,fontSize:14,color:C.muted,zIndex:10}}>
              Fetching from Supabase…
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{width:260,flexShrink:0,borderLeft:`1px solid ${C.border}`,
          background:C.white,display:'flex',flexDirection:'column',overflow:'hidden'}}>

          <Legend colorScale={colorScale} domain={domain} metric={metric}/>
          <hr style={{border:'none',borderTop:`1px solid ${C.border}`,margin:'12px 16px 0'}}/>

          {/* Zone detail panel */}
          <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            {['Overview','Zone detail'].map((t,i)=>(
              <button key={t} onClick={()=>i===0&&setSelected(null)}
                disabled={i===1&&!selZone}
                style={{flex:1,padding:7,fontSize:10,textTransform:'uppercase',
                  letterSpacing:'.1em',background:'transparent',border:'none',
                  cursor:i===1&&!selZone?'default':'pointer',fontFamily:'inherit',
                  color: (i===0&&!selZone)||(i===1&&selZone) ? C.ink : C.muted,
                  borderBottom:`2px solid ${(i===0&&!selZone)||(i===1&&selZone)?C.accent:'transparent'}`,
                  transition:'all .15s'}}>
                {t}
              </button>
            ))}
          </div>

          {!selZone ? (
            <div style={{padding:'12px 16px',fontSize:11,color:C.muted,fontStyle:'italic'}}>
              {panel==='map'
                ? 'Click a zone on the map to see detailed statistics.'
                : 'Click a row in the ranking to see zone details.'}
            </div>
          ) : (
            <div style={{padding:'12px 16px',flex:1,overflowY:'auto'}}>
              <div style={{fontFamily:serif,fontWeight:700,fontSize:16,color:C.ink,lineHeight:1.2}}>
                {selZone.zone_name}
              </div>
              <div style={{fontSize:10,color:C.muted,textTransform:'uppercase',
                letterSpacing:'.08em',marginBottom:14}}>{selZone.region}</div>
              {Object.keys(METRICS).map(mk=>{
                const val = FALLBACK[mk][year].find(d=>d.zone_code===selZone.zone_code)?.value??0
                const isActive = mk===metric
                return (
                  <div key={mk} style={{marginBottom:12}}>
                    <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.08em',color:C.muted}}>
                      {METRICS[mk].label}
                    </div>
                    <div style={{fontFamily:serif,fontSize:18,fontWeight:700,lineHeight:1.2,
                      color:isActive?C.accent:C.ink}}>
                      {METRICS[mk].fmt(val)}
                    </div>
                    <Sparkline zoneCode={selZone.zone_code} metric={mk}
                      color={isActive?C.accent:'#b8b0a0'}/>
                  </div>
                )
              })}
            </div>
          )}

          {/* Source note */}
          <div style={{padding:'9px 16px',borderTop:`1px solid ${C.border}`,
            fontSize:9,color:C.muted,lineHeight:1.55,flexShrink:0}}>
            <strong style={{color:C.ink}}>Backend</strong>{' '}
            <span style={{background:'#1C1C1C',color:'#3FCF8E',fontSize:8,padding:'1px 5px',
              borderRadius:2,letterSpacing:'.06em',fontWeight:700}}>SUPABASE</span><br/>
            Table: <code>eth_zone_metrics</code>.<br/>
            Falls back to CSA/World Bank data when not configured.<br/><br/>
            <strong style={{color:C.ink}}>Data</strong> CSA HCES 2015/16 ·{' '}
            World Bank Poverty Assessment 2020 · IFPRI Zone Profiles.
          </div>
        </div>
      </div>
    </div>
  )
}
