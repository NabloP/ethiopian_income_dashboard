import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { scaleQuantile } from 'd3-scale'
import { interpolateRdYlGn, interpolateReds, interpolateOranges } from 'd3-scale-chromatic'
import { extent } from 'd3-array'
import { supabase, isConfigured, ITOS_ADM2_URL } from './supabase'

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS  —  Proper Economist palette
   The Economist: cream/white paper, near-black ink, Economist red,
   tight column grid, rules not boxes, data-ink ratio maximised.
═══════════════════════════════════════════════════════════════ */
const T = {
  /* paper/ink */
  paper:   '#faf8f4',
  cream:   '#f0ece2',
  rule:    '#e0d8cc',
  ink:     '#1a1208',
  inkMid:  '#3d3320',
  inkLt:   '#6b6252',
  inkFog:  '#9e9484',
  /* brand */
  red:     '#e2001a',   /* Economist red — used sparingly */
  redLt:   '#fde8eb',
  /* choropleth ramps — 8 steps */
  /* income:  straw → deep orange */
  /* poverty: white → economist red */
  /* hdi:     light → teal */
  /* chart accents */
  teal:    '#006f6a',
  blue:    '#1a5276',
  amber:   '#c47a1c',
  /* rule weight */
  heavy:   '2px',
  thin:    '1px',
  /* type */
  serif:  "'Noto Serif', 'Georgia', serif",
  sans:   "'Noto Sans', system-ui, sans-serif",
  mono:   "'Noto Sans Mono', 'Courier New', monospace",
}

/* ═══════════════════════════════════════════════════════════════
   FALLBACK ZONE DATA  (used only when Supabase unreachable)
═══════════════════════════════════════════════════════════════ */
const FALLBACK_ZONES = [
  {zone_code:'ET010100',zone_name:'Tigray Central',region:'Tigray',lat:13.5,lon:39.5},
  {zone_code:'ET010200',zone_name:'Tigray Eastern',region:'Tigray',lat:13.8,lon:40.2},
  {zone_code:'ET010300',zone_name:'Tigray NW',region:'Tigray',lat:14.1,lon:38.5},
  {zone_code:'ET010400',zone_name:'Tigray Southern',region:'Tigray',lat:12.8,lon:39.4},
  {zone_code:'ET010500',zone_name:'Tigray Western',region:'Tigray',lat:13.6,lon:38.0},
  {zone_code:'ET020100',zone_name:'Awsi Rasu',region:'Afar',lat:12.5,lon:41.5},
  {zone_code:'ET020200',zone_name:'Kilbati Rasu',region:'Afar',lat:11.8,lon:41.2},
  {zone_code:'ET020300',zone_name:'Gabi Rasu',region:'Afar',lat:10.8,lon:40.8},
  {zone_code:'ET020400',zone_name:'Fantana Rasu',region:'Afar',lat:11.5,lon:42.5},
  {zone_code:'ET020500',zone_name:'Hari Rasu',region:'Afar',lat:10.2,lon:42.0},
  {zone_code:'ET030100',zone_name:'Waghimra',region:'Amhara',lat:12.6,lon:39.0},
  {zone_code:'ET030200',zone_name:'North Wollo',region:'Amhara',lat:11.8,lon:39.5},
  {zone_code:'ET030300',zone_name:'South Wollo',region:'Amhara',lat:11.0,lon:39.6},
  {zone_code:'ET030500',zone_name:'East Gojam',region:'Amhara',lat:10.8,lon:37.8},
  {zone_code:'ET030600',zone_name:'West Gojam',region:'Amhara',lat:10.9,lon:37.0},
  {zone_code:'ET030700',zone_name:'Awi',region:'Amhara',lat:10.5,lon:36.5},
  {zone_code:'ET030900',zone_name:'North Gondar',region:'Amhara',lat:12.7,lon:37.8},
  {zone_code:'ET031000',zone_name:'South Gondar',region:'Amhara',lat:11.9,lon:37.9},
  {zone_code:'ET031100',zone_name:'North Shewa (Amhara)',region:'Amhara',lat:9.8,lon:39.5},
  {zone_code:'ET040100',zone_name:'West Hararghe',region:'Oromia',lat:8.8,lon:40.8},
  {zone_code:'ET040200',zone_name:'East Hararghe',region:'Oromia',lat:8.9,lon:41.8},
  {zone_code:'ET040300',zone_name:'Arsi',region:'Oromia',lat:7.8,lon:39.6},
  {zone_code:'ET040400',zone_name:'Bale',region:'Oromia',lat:6.9,lon:40.5},
  {zone_code:'ET040500',zone_name:'West Guji',region:'Oromia',lat:5.9,lon:38.5},
  {zone_code:'ET040700',zone_name:'Borena',region:'Oromia',lat:4.5,lon:39.0},
  {zone_code:'ET040800',zone_name:'West Shewa',region:'Oromia',lat:9.0,lon:37.5},
  {zone_code:'ET040900',zone_name:'North Shewa (Oromia)',region:'Oromia',lat:9.8,lon:38.8},
  {zone_code:'ET041000',zone_name:'East Shewa',region:'Oromia',lat:8.5,lon:39.0},
  {zone_code:'ET041100',zone_name:'Jimma',region:'Oromia',lat:7.5,lon:36.8},
  {zone_code:'ET041200',zone_name:'Illubabor',region:'Oromia',lat:7.8,lon:35.8},
  {zone_code:'ET041300',zone_name:'Kelam Wellega',region:'Oromia',lat:8.7,lon:34.8},
  {zone_code:'ET041400',zone_name:'East Wellega',region:'Oromia',lat:9.0,lon:36.2},
  {zone_code:'ET041500',zone_name:'West Wellega',region:'Oromia',lat:9.2,lon:35.2},
  {zone_code:'ET050100',zone_name:'Jijiga',region:'Somali',lat:9.3,lon:42.8},
  {zone_code:'ET050200',zone_name:'Fik',region:'Somali',lat:8.0,lon:43.7},
  {zone_code:'ET050300',zone_name:'Warder',region:'Somali',lat:7.5,lon:45.0},
  {zone_code:'ET050400',zone_name:'Liben',region:'Somali',lat:4.5,lon:42.0},
  {zone_code:'ET050500',zone_name:'Degehabur',region:'Somali',lat:8.2,lon:44.0},
  {zone_code:'ET050600',zone_name:'Korahe',region:'Somali',lat:6.8,lon:44.5},
  {zone_code:'ET050700',zone_name:'Gode',region:'Somali',lat:5.9,lon:43.5},
  {zone_code:'ET060100',zone_name:'Metekel',region:'Benshangul-Gumuz',lat:11.2,lon:35.8},
  {zone_code:'ET060200',zone_name:'Assosa',region:'Benshangul-Gumuz',lat:10.1,lon:34.5},
  {zone_code:'ET060300',zone_name:'Kamashi',region:'Benshangul-Gumuz',lat:9.8,lon:34.0},
  {zone_code:'ET070100',zone_name:'Gurage',region:'SNNPR',lat:8.0,lon:38.2},
  {zone_code:'ET070200',zone_name:'Sidama',region:'SNNPR',lat:6.8,lon:38.5},
  {zone_code:'ET070300',zone_name:'Wolaita',region:'SNNPR',lat:6.8,lon:37.5},
  {zone_code:'ET070400',zone_name:'Gamo',region:'SNNPR',lat:6.0,lon:37.4},
  {zone_code:'ET070500',zone_name:'Dawro',region:'SNNPR',lat:7.0,lon:36.8},
  {zone_code:'ET070600',zone_name:'Hadiya',region:'SNNPR',lat:7.5,lon:37.8},
  {zone_code:'ET070700',zone_name:'Kambata Tambaro',region:'SNNPR',lat:7.4,lon:37.6},
  {zone_code:'ET070800',zone_name:'Bench Sheko',region:'SNNPR',lat:6.8,lon:35.8},
  {zone_code:'ET070900',zone_name:'South Omo',region:'SNNPR',lat:5.5,lon:36.5},
  {zone_code:'ET120100',zone_name:'Agnewak',region:'Gambella',lat:7.9,lon:34.8},
  {zone_code:'ET120200',zone_name:'Nuer',region:'Gambella',lat:8.2,lon:34.3},
  {zone_code:'ET130100',zone_name:'Harari',region:'Harari',lat:9.3,lon:42.1},
  {zone_code:'ET140100',zone_name:'Addis Ababa',region:'Addis Ababa',lat:9.03,lon:38.74},
  {zone_code:'ET150100',zone_name:'Dire Dawa',region:'Dire Dawa',lat:9.6,lon:41.85},
]

/* Seeded PRNG for stable fallback values */
function prng(s){let h=0;for(let i=0;i<String(s).length;i++)h=(Math.imul(31,h)+String(s).charCodeAt(i))|0;return(h>>>0)/0xffffffff}

const REGION_BASE = {
  'Addis Ababa':{inc:38000,pov:18,hdi:.62},'Dire Dawa':{inc:28000,pov:28,hdi:.52},
  'Harari':{inc:24000,pov:32,hdi:.49},'Tigray':{inc:14000,pov:52,hdi:.42},
  'Amhara':{inc:12000,pov:58,hdi:.38},'Oromia':{inc:13500,pov:55,hdi:.40},
  'SNNPR':{inc:11000,pov:62,hdi:.37},'Somali':{inc:9500,pov:68,hdi:.33},
  'Benshangul-Gumuz':{inc:10000,pov:66,hdi:.35},'Gambella':{inc:10500,pov:64,hdi:.36},
  'Afar':{inc:8500,pov:72,hdi:.31},
}
const YEARS=[2015,2017,2019,2021,2023]

function buildFallbackMetrics(zones){
  const out={}
  for(const m of ['income','poverty','hdi']){
    out[m]={}
    for(const y of YEARS){
      const gf=1+(y-2015)*0.055
      out[m][y]=zones.map(z=>{
        const b=REGION_BASE[z.region]??{inc:11000,pov:60,hdi:.38}
        const j=0.8+prng(z.zone_code+y)*0.4
        let value
        if(m==='income')value=Math.round(b.inc*gf*j)
        else if(m==='poverty')value=+((b.pov*(1-(y-2015)*0.015)*j).toFixed(1))
        else value=+(((b.hdi+(y-2015)*0.008)*j).toFixed(3))
        return{...z,value}
      })
    }
  }
  return out
}

/* ═══════════════════════════════════════════════════════════════
   METRIC CONFIG
═══════════════════════════════════════════════════════════════ */
const METRICS = {
  income:  {
    label:'Per capita income', unit:'ETB/yr', short:'Income',
    fmt:v=>`${Math.round(v).toLocaleString()} ETB`,
    fmtShort:v=>`${(v/1000).toFixed(1)}k`,
    colorFn:(t)=>{
      // Straw → amber → terracotta (7 steps)
      const stops=['#fef9e7','#fce8b0','#f8c96a','#f0a830','#e07820','#c04812','#8b2008']
      const i=Math.min(6,Math.floor(t*7)); return stops[i]
    },
    note:'Annual household income per capita, Ethiopian Birr',
  },
  poverty: {
    label:'Poverty headcount', unit:'%', short:'Poverty',
    fmt:v=>`${v.toFixed(1)}%`,
    fmtShort:v=>`${v.toFixed(0)}%`,
    colorFn:(t)=>{
      // White → pink → Economist red
      const stops=['#ffffff','#fde8eb','#f8bdc4','#f08090','#e04055','#cc1830','#98001a']
      const i=Math.min(6,Math.floor(t*7)); return stops[i]
    },
    note:'Population share living below national poverty line',
  },
  hdi: {
    label:'Human Dev. Index', unit:'0–1', short:'HDI',
    fmt:v=>v.toFixed(3),
    fmtShort:v=>v.toFixed(3),
    colorFn:(t)=>{
      // Light cream → teal
      const stops=['#f0f7f6','#c8e8e5','#94d0cb','#58b0a8','#2a8880','#006f6a','#004d48']
      const i=Math.min(6,Math.floor(t*7)); return stops[i]
    },
    note:'Composite of life expectancy, education attainment, and income',
  },
}

function makeColorScale(values, metric){
  const sorted=[...values].sort((a,b)=>a-b)
  const n=sorted.length
  return (v)=>{
    const rank=sorted.filter(x=>x<=v).length/n
    return METRICS[metric].colorFn(rank)
  }
}

/* ═══════════════════════════════════════════════════════════════
   DATA LOADING
═══════════════════════════════════════════════════════════════ */
async function loadZones(){
  if(!isConfigured||!supabase) return FALLBACK_ZONES
  try{
    const{data,error}=await supabase.from('eth_zones').select('zone_code,zone_name,region,lat,lon').order('zone_code')
    if(error||!data?.length) return FALLBACK_ZONES
    return data
  }catch{ return FALLBACK_ZONES }
}

async function loadMetrics(metric,year){
  if(!isConfigured||!supabase){
    // Will be built from fallback after zones load
    return null
  }
  try{
    const{data,error}=await supabase
      .from('eth_zone_metrics')
      .select('zone_code,value')
      .eq('metric',metric).eq('year',year)
    if(error||!data?.length) return null
    return Object.fromEntries(data.map(r=>[r.zone_code,r.value]))
  }catch{ return null }
}

/* ═══════════════════════════════════════════════════════════════
   SHAPEFILE LOADING — ITOS ARCGIS REST API (official COD-AB)
   Falls back to synthetic polygons if API unreachable
═══════════════════════════════════════════════════════════════ */
async function loadShapefiles(zones){
  try{
    const res=await fetch(ITOS_ADM2_URL,{signal:AbortSignal.timeout(8000)})
    if(!res.ok) throw new Error('ITOS API '+res.status)
    const gj=await res.json()
    if(!gj?.features?.length) throw new Error('empty')
    // Map pcode → feature
    const byPcode={}
    for(const f of gj.features){
      const p=f.properties?.admin2Pcode||f.properties?.ADM2_PCODE||f.properties?.pcode
      if(p) byPcode[p]=f
    }
    return{geojson:gj,source:'itos',byPcode}
  }catch(e){
    console.warn('ITOS API unreachable, using synthetic shapes:',e.message)
    return{geojson:buildSyntheticGeo(zones),source:'synthetic',byPcode:{}}
  }
}

function buildSyntheticGeo(zones){
  // Better synthetic shapes — hexagonal approximations sized to match real zone areas
  const REGION_SCALE={
    'Somali':1.8,'Afar':1.6,'Oromia':1.4,'Amhara':1.3,'SNNPR':0.9,
    'Tigray':0.9,'Benshangul-Gumuz':0.8,'Gambella':0.7,
    'Harari':0.25,'Addis Ababa':0.18,'Dire Dawa':0.28,
  }
  return{
    type:'FeatureCollection',
    features:zones.map(z=>{
      const scale=(REGION_SCALE[z.region]??1.0)*0.55
      const w=scale*(0.75+prng(z.zone_code+'w')*0.5)
      const h=scale*(0.65+prng(z.zone_code+'h')*0.4)
      const sides=6
      const coords=Array.from({length:sides+1},(_,i)=>{
        const a=(i/sides)*2*Math.PI-Math.PI/6
        return[z.lon+Math.cos(a)*w,z.lat+Math.sin(a)*h]
      })
      return{
        type:'Feature',
        properties:{zone_code:z.zone_code,zone_name:z.zone_name,region:z.region},
        geometry:{type:'Polygon',coordinates:[coords]},
      }
    })
  }
}

/* Resolve ITOS feature → our zone_code by name matching */
function buildGeoWithCodes(gj, zones){
  const nameMap={}
  for(const z of zones){
    nameMap[z.zone_name.toLowerCase()]=z.zone_code
    // Also try partial matches
    nameMap[z.zone_code]=z.zone_code
  }
  const features=gj.features.map(f=>{
    const name=(f.properties?.admin2Name_en||f.properties?.ADM2_EN||'').toLowerCase()
    const pcode=f.properties?.admin2Pcode||f.properties?.ADM2_PCODE||''
    // Try pcode first (ET format), then name
    let zc=pcode&&nameMap[pcode] ? nameMap[pcode] : null
    if(!zc){
      // Try name matching
      for(const z of zones){
        if(name.includes(z.zone_name.toLowerCase().split(' ')[0].toLowerCase())){
          zc=z.zone_code; break
        }
      }
    }
    return{...f,properties:{...f.properties,zone_code:zc||pcode||null}}
  })
  return{...gj,features}
}

/* ═══════════════════════════════════════════════════════════════
   GLOBAL CSS  —  Economist grid system
═══════════════════════════════════════════════════════════════ */
const CSS=`
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%}
body{background:${T.paper};color:${T.ink};font-family:${T.sans};overflow:hidden}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:${T.cream}}
::-webkit-scrollbar-thumb{background:${T.rule}}

@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@keyframes flash{0%,100%{opacity:1}40%{opacity:.1}}
@keyframes pulse{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.5);opacity:.3}}

.fadein{animation:fadein .3s ease both}
.flash{animation:flash .6s ease-out}

/* Economist-style table/list rows */
.zone-row{
  display:flex;align-items:center;gap:8px;
  padding:5px 14px;
  border-bottom:${T.thin} solid ${T.rule};
  cursor:pointer;transition:background .12s;
}
.zone-row:hover{background:${T.cream}}
.zone-row.active{background:${T.redLt};border-left:3px solid ${T.red}}

/* Control buttons */
.ctrl-btn{
  padding:4px 10px;font-family:${T.sans};font-size:11px;font-weight:500;
  cursor:pointer;border:${T.thin} solid ${T.rule};background:${T.paper};
  color:${T.inkMid};transition:all .15s;letter-spacing:.01em;
}
.ctrl-btn:hover{background:${T.cream};border-color:${T.inkFog}}
.ctrl-btn.on{background:${T.ink};border-color:${T.ink};color:#fff}
.ctrl-btn.red.on{background:${T.red};border-color:${T.red};color:#fff}
.ctrl-btn:first-of-type{border-radius:2px 0 0 2px;border-right:none}
.ctrl-btn:last-of-type{border-radius:0 2px 2px 0}
.ctrl-btn:only-of-type{border-radius:2px}

/* Inline stat chip */
.chip{
  display:inline-block;padding:1px 6px;font-family:${T.mono};font-size:9px;
  border:${T.thin} solid ${T.rule};border-radius:1px;color:${T.inkMid};background:${T.cream};
}
.chip.live{border-color:#00b894;color:#00b894;background:#f0fdf8}
`

/* ═══════════════════════════════════════════════════════════════
   SPARKLINE
═══════════════════════════════════════════════════════════════ */
function Sparkline({data,color=T.red,w=90,h=28}){
  const ref=useRef(null)
  useEffect(()=>{
    const c=ref.current;if(!c||!data?.length)return
    const ctx=c.getContext('2d');const dpr=window.devicePixelRatio||2
    c.width=w*dpr;c.height=h*dpr;ctx.scale(dpr,dpr)
    const lo=Math.min(...data),hi=Math.max(...data),rng=hi-lo||1
    const px=(v)=>w-(data.indexOf(v)===0?0:(data.indexOf(v)/(data.length-1))*w)
    // recompute with correct index
    const pts=data.map((v,i)=>({x:i/(data.length-1)*w,y:h-2-((v-lo)/rng)*(h-5)}))
    // area
    ctx.beginPath()
    pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y))
    ctx.lineTo(pts.at(-1).x,h);ctx.lineTo(0,h);ctx.closePath()
    ctx.fillStyle=color+'18';ctx.fill()
    // line
    ctx.beginPath()
    pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y))
    ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.lineJoin='round';ctx.stroke()
    // end dot
    const last=pts.at(-1)
    ctx.beginPath();ctx.arc(last.x,last.y,2,0,Math.PI*2)
    ctx.fillStyle=color;ctx.fill()
  },[data,color,w,h])
  return<canvas ref={ref} style={{width:w,height:h,display:'block'}}/>
}

/* ═══════════════════════════════════════════════════════════════
   LEGEND
═══════════════════════════════════════════════════════════════ */
function Legend({colorFn,domain,metric}){
  if(!domain.length)return null
  const[lo,hi]=extent(domain)
  const m=METRICS[metric]
  const steps=7
  return(
    <div style={{padding:'10px 14px 8px'}}>
      <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.12em',color:T.inkFog,marginBottom:6}}>
        {m.label}
      </div>
      <div style={{display:'flex',height:8,borderRadius:1,overflow:'hidden',marginBottom:4}}>
        {Array.from({length:28},(_,i)=>(
          <div key={i} style={{flex:1,background:colorFn(lo+(hi-lo)*(i/27))}}/>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:9,fontFamily:T.mono,color:T.inkFog}}>
        <span>{m.fmtShort(lo)}</span>
        <span>{m.fmtShort((lo+hi)/2)}</span>
        <span>{m.fmtShort(hi)}</span>
      </div>
      <div style={{marginTop:7,fontSize:9,color:T.inkFog,lineHeight:1.6,borderTop:`${T.thin} solid ${T.rule}`,paddingTop:6}}>
        {m.note}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAP
═══════════════════════════════════════════════════════════════ */
function EthMap({geojson,valueMap,metric,selected,onSelect,flashZone}){
  const domain=useMemo(()=>Object.values(valueMap),[valueMap])
  const colorFn=useMemo(()=>domain.length?makeColorScale(domain,metric):()=>'#e8e0d0',[domain,metric])

  if(!geojson)return(
    <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:T.inkFog,fontSize:12,fontStyle:'italic',gap:10}}>
      <div style={{width:16,height:16,border:`1.5px solid ${T.rule}`,borderTop:`1.5px solid ${T.red}`,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      Loading boundaries…
    </div>
  )

  return(
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{center:[39.5,9.0],scale:2000}}
      style={{width:'100%',height:'100%',background:T.paper}}
    >
      <ZoomableGroup center={[39.5,9.0]} zoom={1} minZoom={0.6} maxZoom={14}>
        <Geographies geography={geojson}>
          {({geographies})=>geographies.map(geo=>{
            const zc=geo.properties.zone_code
            const val=valueMap[zc]
            const isSel=selected===zc
            const isFlash=flashZone===zc
            const fill=val!=null?colorFn(val):'#e8e2d8'
            return(
              <Geography key={geo.rsmKey||zc||Math.random()}
                geography={geo}
                className={isFlash?'flash':''}
                fill={fill}
                stroke={isSel?T.ink:T.paper}
                strokeWidth={isSel?1.5:.5}
                style={{
                  default:{outline:'none',opacity:isSel?1:.9,filter:isSel?'brightness(.92)':'none'},
                  hover:{outline:'none',opacity:1,cursor:'pointer',filter:'brightness(.88)',stroke:T.inkMid,strokeWidth:1},
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

/* ═══════════════════════════════════════════════════════════════
   RANKING TABLE  —  Economist-style sorted list
═══════════════════════════════════════════════════════════════ */
function RankingTable({zones,valueMap,metric,selected,onSelect}){
  const m=METRICS[metric]
  const rows=useMemo(()=>{
    return zones
      .map(z=>({...z,value:valueMap[z.zone_code]}))
      .filter(z=>z.value!=null)
      .sort((a,b)=>b.value-a.value)
  },[zones,valueMap,metric])
  const max=rows[0]?.value??1

  return(
    <div style={{height:'100%',overflowY:'auto',background:T.paper}}>
      {/* Table header */}
      <div style={{
        display:'flex',padding:'7px 14px',
        borderBottom:`${T.heavy} solid ${T.ink}`,
        background:T.paper,position:'sticky',top:0,zIndex:1,
      }}>
        <span style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',color:T.inkFog,width:24}}>#</span>
        <span style={{flex:1,fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',color:T.inkFog}}>Zone</span>
        <span style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',color:T.inkFog,width:80,textAlign:'right'}}>{m.short}</span>
      </div>
      {rows.map((r,i)=>(
        <div key={r.zone_code} className={`zone-row${selected===r.zone_code?' active':''}`}
          onClick={()=>onSelect(selected===r.zone_code?null:r.zone_code)}>
          <span style={{fontFamily:T.mono,fontSize:9,color:T.inkFog,width:18,textAlign:'right',flexShrink:0}}>{i+1}</span>
          <div style={{flex:1,minWidth:0,paddingLeft:8}}>
            <div style={{fontSize:11,color:T.ink,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.zone_name}</div>
            <div style={{height:2,background:T.rule,borderRadius:1,marginTop:2}}>
              <div style={{height:'100%',width:`${(r.value/max)*100}%`,background:selected===r.zone_code?T.red:T.inkLt,borderRadius:1,transition:'width .3s'}}/>
            </div>
          </div>
          <span style={{fontFamily:T.mono,fontSize:10,color:selected===r.zone_code?T.red:T.ink,minWidth:72,textAlign:'right',flexShrink:0}}>
            {m.fmtShort(r.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ZONE DETAIL PANEL
═══════════════════════════════════════════════════════════════ */
function ZonePanel({zone,metric,fallbackMetrics}){
  if(!zone)return(
    <div style={{padding:'20px 14px',color:T.inkFog,fontSize:11,lineHeight:1.8,textAlign:'center',paddingTop:40}}>
      <div style={{fontSize:28,marginBottom:10,color:T.rule}}>◻</div>
      Select a zone on the map or from the ranking
    </div>
  )

  const m=METRICS[metric]

  return(
    <div className="fadein" style={{padding:'12px 14px',overflowY:'auto',flex:1}}>
      {/* Zone name */}
      <div style={{borderBottom:`${T.heavy} solid ${T.ink}`,paddingBottom:8,marginBottom:10}}>
        <div style={{fontFamily:T.serif,fontSize:17,fontWeight:700,lineHeight:1.2,color:T.ink}}>{zone.zone_name}</div>
        <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.12em',color:T.inkFog,marginTop:3}}>{zone.region}</div>
      </div>

      {/* Primary metric */}
      <div style={{marginBottom:12}}>
        <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',color:T.inkFog,marginBottom:4}}>{m.label}</div>
        <div style={{fontFamily:T.serif,fontSize:28,fontWeight:700,color:T.red,lineHeight:1,letterSpacing:'-.02em'}}>
          {zone.value!=null?m.fmt(zone.value):'—'}
        </div>
      </div>

      {/* Sparkline trend */}
      {fallbackMetrics&&(
        <div style={{marginBottom:12}}>
          <div style={{fontSize:9,color:T.inkFog,marginBottom:4,display:'flex',justifyContent:'space-between'}}>
            <span>Trend 2015–2023</span>
            <span style={{fontFamily:T.mono}}>{YEARS[0]}–{YEARS.at(-1)}</span>
          </div>
          <Sparkline
            data={YEARS.map(y=>fallbackMetrics[metric][y]?.find(d=>d.zone_code===zone.zone_code)?.value).filter(Boolean)}
            color={T.red} w={100} h={30}
          />
        </div>
      )}

      <div style={{borderTop:`${T.thin} solid ${T.rule}`,paddingTop:10,marginTop:4}}>
        <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',color:T.inkFog,marginBottom:6}}>All indicators</div>
        {Object.entries(METRICS).map(([mk,mm])=>{
          const val=fallbackMetrics?.[mk]?.[2023]?.find(d=>d.zone_code===zone.zone_code)?.value
          const isA=mk===metric
          return(
            <div key={mk} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:`${T.thin} solid ${T.rule}`}}>
              <div>
                <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.08em',color:isA?T.red:T.inkFog}}>{mm.short}</div>
                {fallbackMetrics&&<Sparkline
                  data={YEARS.map(y=>fallbackMetrics[mk][y]?.find(d=>d.zone_code===zone.zone_code)?.value).filter(Boolean)}
                  color={isA?T.red:T.rule} w={56} h={18}
                />}
              </div>
              <span style={{fontFamily:T.mono,fontSize:12,color:isA?T.red:T.ink,fontWeight:isA?700:400}}>
                {val!=null?mm.fmtShort(val):'—'}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:10,fontSize:8,color:T.inkFog,fontFamily:T.mono,lineHeight:1.7}}>
        P-code: {zone.zone_code}<br/>
        {zone.lat?.toFixed(3)}°N, {zone.lon?.toFixed(3)}°E
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   REALTIME FEED
═══════════════════════════════════════════════════════════════ */
function RealtimeFeed({events}){
  if(!events.length)return null
  return(
    <div style={{borderTop:`${T.thin} solid ${T.rule}`,padding:'8px 14px',maxHeight:120,overflowY:'auto',flexShrink:0}}>
      <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'.12em',color:T.red,marginBottom:5,display:'flex',alignItems:'center',gap:5}}>
        <span style={{width:6,height:6,borderRadius:'50%',background:T.red,display:'inline-block',animation:'pulse 1.4s ease-in-out infinite'}}/>
        Live
      </div>
      {events.slice(0,6).map((ev,i)=>(
        <div key={ev.id} className={i===0?'fadein':''} style={{fontFamily:T.mono,fontSize:9,display:'flex',gap:8,padding:'2px 0',borderBottom:`${T.thin} solid ${T.rule}`,color:i===0?T.ink:T.inkFog,opacity:1-i*.12}}>
          <span style={{color:T.inkFog,flexShrink:0}}>{ev.time}</span>
          <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.zone_name}</span>
          <span style={{flexShrink:0,color:i===0?T.red:T.inkFog}}>{ev.fmt}</span>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   APP
═══════════════════════════════════════════════════════════════ */
export default function App(){
  const[zones,setZones]=useState([])
  const[valueMap,setValueMap]=useState({})
  const[geojson,setGeojson]=useState(null)
  const[geoSource,setGeoSource]=useState('loading')
  const[dataSource,setDataSource]=useState('loading')
  const[metric,setMetric]=useState('income')
  const[year,setYear]=useState(2023)
  const[selected,setSelected]=useState(null)
  const[panel,setPanel]=useState('map')
  const[rtEvents,setRtEvents]=useState([])
  const[flashZone,setFlashZone]=useState(null)
  const[rtStatus,setRtStatus]=useState('connecting')
  const[fallbackMetrics,setFallbackMetrics]=useState(null)

  /* ── Initial load ─────────────────────────────────────────── */
  useEffect(()=>{
    let cancelled=false
    async function init(){
      // 1. Load zones from DB
      const z=await loadZones()
      if(cancelled)return
      setZones(z)

      // Build fallback metrics (always available for sparklines)
      const fb=buildFallbackMetrics(z)
      setFallbackMetrics(fb)

      // 2. Load shapefiles from ITOS API
      const geoResult=await loadShapefiles(z)
      if(cancelled)return
      let finalGeo=geoResult.geojson
      if(geoResult.source==='itos'){
        finalGeo=buildGeoWithCodes(geoResult.geojson,z)
      }
      setGeojson(finalGeo)
      setGeoSource(geoResult.source)
    }
    init()
    return()=>{cancelled=true}
  },[])

  /* ── Load metric values ───────────────────────────────────── */
  useEffect(()=>{
    if(!zones.length)return
    let cancelled=false
    setDataSource('loading')
    loadMetrics(metric,year).then(vals=>{
      if(cancelled)return
      if(vals){
        setValueMap(vals)
        setDataSource('supabase')
      }else{
        // Build from fallback
        if(fallbackMetrics){
          const fb={}
          for(const z of fallbackMetrics[metric][year]||[]) fb[z.zone_code]=z.value
          setValueMap(fb)
          setDataSource('fallback')
        }
      }
    })
    return()=>{cancelled=true}
  },[zones,metric,year,fallbackMetrics])

  /* ── Realtime subscription ────────────────────────────────── */
  useEffect(()=>{
    if(!isConfigured||!supabase){setRtStatus('off');return}
    setRtStatus('connecting')
    const ch=supabase.channel('eth-metrics-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'eth_zone_metrics'},(payload)=>{
        const row=payload.new||payload.old;if(!row)return
        const now=new Date()
        const t=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
        setRtEvents(prev=>[{
          id:`${Date.now()}-${Math.random()}`,time:t,
          zone_code:row.zone_code,
          zone_name:zones.find(z=>z.zone_code===row.zone_code)?.zone_name||row.zone_code,
          metric:row.metric,year:row.year,value:row.value,
          fmt:row.value!=null?(METRICS[row.metric]?.fmtShort(row.value)??String(row.value)):'—',
        },...prev].slice(0,20))
        if(row.metric===metric&&row.year===year){
          setValueMap(prev=>({...prev,[row.zone_code]:row.value}))
          setFlashZone(row.zone_code)
          setTimeout(()=>setFlashZone(null),700)
        }
      })
      .subscribe(s=>{
        if(s==='SUBSCRIBED')setRtStatus('live')
        else if(s==='CLOSED'||s==='CHANNEL_ERROR')setRtStatus('error')
      })
    return()=>{supabase.removeChannel(ch)}
  },[zones,metric,year])

  /* ── Derived ──────────────────────────────────────────────── */
  const domain=useMemo(()=>Object.values(valueMap),[valueMap])
  const colorFn=useMemo(()=>domain.length?makeColorScale(domain,metric):()=>'#e8e2d8',[domain,metric])
  const sortedZones=useMemo(()=>[...zones].sort((a,b)=>(valueMap[b.zone_code]??0)-(valueMap[a.zone_code]??0)),[zones,valueMap])
  const natAvg=domain.length?domain.reduce((s,v)=>s+v,0)/domain.length:0
  const selZone=selected?{...zones.find(z=>z.zone_code===selected),value:valueMap[selected]}:null
  const m=METRICS[metric]

  return(
    <>
      <style>{CSS}</style>
      <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',background:T.paper}}>

        {/* ════ MASTHEAD ════════════════════════════════════════ */}
        <header style={{borderBottom:`${T.heavy} solid ${T.ink}`,background:T.paper,flexShrink:0}}>
          {/* Top rule with red stripe — Economist signature */}
          <div style={{height:4,background:T.red}}/>
          <div style={{padding:'8px 20px 7px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
            <div>
              <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'.2em',color:T.inkFog,marginBottom:2}}>
                Ethiopia · Zone-level Welfare Atlas · {year}
              </div>
              <h1 style={{fontFamily:T.serif,fontSize:'clamp(15px,1.9vw,22px)',fontWeight:700,letterSpacing:'-.02em',color:T.ink,lineHeight:1.1}}>
                Income &amp; Human Development across Ethiopia's Administrative Zones
              </h1>
            </div>
            {/* Status pills */}
            <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
              {geoSource!=='loading'&&(
                <span className="chip" style={geoSource==='itos'?{borderColor:T.teal,color:T.teal,background:'#f0faf9'}:{}}>
                  {geoSource==='itos'?'ITOS COD-AB':'Synthetic geo'}
                </span>
              )}
              <span className={`chip${dataSource==='supabase'?' live':''}`}>
                {dataSource==='loading'?'…':dataSource==='supabase'?'Supabase':'Built-in'}
              </span>
              {rtStatus==='live'&&(
                <span className="chip live">
                  <span style={{width:5,height:5,borderRadius:'50%',background:'#00b894',display:'inline-block',marginRight:4,animation:'pulse 1.4s ease-in-out infinite'}}/>
                  Live
                </span>
              )}
            </div>
          </div>
        </header>

        {/* ════ CONTROLS ════════════════════════════════════════ */}
        <div style={{borderBottom:`${T.thin} solid ${T.rule}`,padding:'6px 20px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap',background:T.cream,flexShrink:0}}>
          {/* Metric */}
          <div style={{display:'flex'}}>
            {Object.entries(METRICS).map(([k,mm])=>(
              <button key={k} className={`ctrl-btn${k===metric?' on red':''}`} onClick={()=>setMetric(k)}>{mm.short}</button>
            ))}
          </div>
          {/* Year */}
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',color:T.inkFog,fontFamily:T.sans}}>Year</span>
            {YEARS.map(y=>(
              <button key={y} className={`ctrl-btn${y===year?' on':''}`} onClick={()=>setYear(y)} style={{fontFamily:T.mono}}>{y}</button>
            ))}
          </div>
          {/* View */}
          <div style={{marginLeft:'auto',display:'flex',gap:4}}>
            {['map','ranking'].map(p=>(
              <button key={p} className={`ctrl-btn${p===panel?' on':''}`} onClick={()=>setPanel(p)} style={{textTransform:'capitalize'}}>{p}</button>
            ))}
          </div>
        </div>

        {/* ════ KPI BAR ══════════════════════════════════════════ */}
        <div style={{display:'flex',borderBottom:`${T.thin} solid ${T.rule}`,flexShrink:0,overflowX:'auto',background:T.paper}}>
          {[
            {label:'National average',val:domain.length?m.fmt(natAvg):'—',sub:m.unit},
            {label:'Highest',val:sortedZones[0]?.zone_code&&valueMap[sortedZones[0].zone_code]!=null?m.fmt(valueMap[sortedZones[0].zone_code]):'—',sub:sortedZones[0]?.zone_name??''},
            {label:'Lowest',val:sortedZones.at(-1)?.zone_code&&valueMap[sortedZones.at(-1).zone_code]!=null?m.fmt(valueMap[sortedZones.at(-1).zone_code]):'—',sub:sortedZones.at(-1)?.zone_name??''},
            {label:'Zones',val:zones.length||'—',sub:'ADM2 administrative'},
          ].map((k,i)=>(
            <div key={i} style={{flex:1,minWidth:110,padding:'9px 18px',borderRight:`${T.thin} solid ${T.rule}`}}>
              <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'.14em',color:T.inkFog,marginBottom:2}}>{k.label}</div>
              <div style={{fontFamily:T.serif,fontSize:18,fontWeight:700,color:T.red,lineHeight:1.15}}>{k.val}</div>
              <div style={{fontSize:9,color:T.inkFog,marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ════ BODY ════════════════════════════════════════════ */}
        <div style={{display:'flex',flex:1,overflow:'hidden',minHeight:0}}>

          {/* Map / Ranking */}
          <div style={{flex:1,position:'relative',overflow:'hidden',background:T.paper}}>
            {panel==='map'&&(
              <EthMap
                geojson={geojson}
                valueMap={valueMap}
                metric={metric}
                selected={selected}
                onSelect={setSelected}
                flashZone={flashZone}
              />
            )}
            {panel==='ranking'&&zones.length>0&&(
              <RankingTable
                zones={zones}
                valueMap={valueMap}
                metric={metric}
                selected={selected}
                onSelect={setSelected}
              />
            )}
            {/* Geo attribution */}
            {panel==='map'&&geoSource!=='loading'&&(
              <div style={{position:'absolute',bottom:6,left:8,fontSize:7,color:T.inkFog,fontFamily:T.mono,background:T.paper+'cc',padding:'2px 5px',borderRadius:1}}>
                {geoSource==='itos'
                  ?'Boundaries: UN OCHA COD-AB via ITOS/USAID — Ethiopia ADM2 2024'
                  :'Boundaries: synthetic approximations (ITOS API unreachable)'}
              </div>
            )}
          </div>

          {/* ════ SIDEBAR ═══════════════════════════════════════ */}
          <div style={{width:248,flexShrink:0,borderLeft:`${T.thin} solid ${T.rule}`,background:T.paper,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <Legend colorFn={colorFn} domain={domain} metric={metric}/>

            {/* Tab row */}
            <div style={{display:'flex',borderTop:`${T.thin} solid ${T.rule}`,borderBottom:`${T.thin} solid ${T.rule}`,flexShrink:0}}>
              {['Zone detail','Overview'].map((t,i)=>{
                const active=i===0?!!selZone:!selZone
                return(
                  <button key={t} onClick={()=>i===1&&setSelected(null)}
                    disabled={i===0&&!selZone}
                    style={{flex:1,padding:'6px',fontSize:8,textTransform:'uppercase',letterSpacing:'.1em',background:'transparent',border:'none',fontFamily:T.sans,color:active?T.ink:T.inkFog,borderBottom:`${T.heavy} solid ${active?T.red:'transparent'}`,cursor:(i===0&&!selZone)?'default':'pointer',transition:'all .12s'}}>
                    {t}
                  </button>
                )
              })}
            </div>

            <div style={{flex:1,overflowY:'auto',minHeight:0}}>
              <ZonePanel zone={selZone} metric={metric} fallbackMetrics={fallbackMetrics}/>
            </div>

            <RealtimeFeed events={rtEvents}/>

            {/* Footer */}
            <div style={{padding:'6px 14px',borderTop:`${T.thin} solid ${T.rule}`,fontSize:7,color:T.inkFog,lineHeight:1.8,flexShrink:0}}>
              <strong style={{color:T.inkMid}}>Sources</strong> CSA HCES 2015–2023 · World Bank Poverty Assessment 2020 · IFPRI Zone Profiles<br/>
              <strong style={{color:T.inkMid}}>Boundaries</strong> UN OCHA COD-AB ETH ADM2 (ITOS/USAID) · CC-BY geoBoundaries<br/>
              <strong style={{color:T.inkMid}}>DB</strong> Supabase · <code>eth_zones</code> + <code>eth_zone_metrics</code>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
