import { useState, useEffect, useRef, useMemo } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { scaleQuantile } from 'd3-scale'
import { interpolateRdYlGn, interpolateBlues, interpolateOranges } from 'd3-scale-chromatic'
import { extent } from 'd3-array'
import { supabase, isConfigured } from './supabase'

/* ══ DESIGN TOKENS ══════════════════════════════════════════════ */
const T = {
  navy:'#0d1b2a', navyMid:'#162032', navyLt:'#1e2d40',
  fog:'#8fa3b8', mist:'#b8c9d9', paper:'#f2ede4',
  ink:'#1a1a1a', accent:'#e8472a', gold:'#c9a84c', teal:'#2a9d8f',
  border:'#2e3f52', live:'#00e5a0',
  serif:"'Libre Baskerville',Georgia,serif",
  sans:"'DM Sans',system-ui,sans-serif",
  mono:"'DM Mono','Courier New',monospace",
}

/* ══ ZONE DATA ══════════════════════════════════════════════════ */
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
  'Addis Ababa':{inc:38000,pov:18,hdi:.62},'Dire Dawa':{inc:28000,pov:28,hdi:.52},
  'Harari':{inc:24000,pov:32,hdi:.49},'Tigray':{inc:14000,pov:52,hdi:.42},
  'Amhara':{inc:12000,pov:58,hdi:.38},'Oromia':{inc:13500,pov:55,hdi:.40},
  'SNNPR':{inc:11000,pov:62,hdi:.37},'Somali':{inc:9500,pov:68,hdi:.33},
  'Benshangul-Gumuz':{inc:10000,pov:66,hdi:.35},'Gambella':{inc:10500,pov:64,hdi:.36},
  'Afar':{inc:8500,pov:72,hdi:.31},
}
const YEARS = [2015,2017,2019,2021,2023]

function seed(s){let h=0;for(let i=0;i<s.length;i++)h=(Math.imul(31,h)+s.charCodeAt(i))|0;return(h>>>0)/0xffffffff}

function buildFallback(metric,year){
  const gf=1+(year-2015)*0.055
  return RAW_ZONES.map(z=>{
    const b=REGION_BASE[z.r]??{inc:11000,pov:60,hdi:.38}
    const j=0.8+seed(z.z+year)*0.4
    let value
    if(metric==='income')value=Math.round(b.inc*gf*j)
    else if(metric==='poverty')value=+((b.pov*(1-(year-2015)*0.015)*j).toFixed(1))
    else value=+(((b.hdi+(year-2015)*0.008)*j).toFixed(3))
    return{zone_code:z.z,zone_name:z.n,region:z.r,lat:z.lat,lon:z.lon,value}
  })
}
const FALLBACK={}
;['income','poverty','hdi'].forEach(m=>{FALLBACK[m]={};YEARS.forEach(y=>{FALLBACK[m][y]=buildFallback(m,y)})})

/* ══ FETCH ══════════════════════════════════════════════════════ */
async function fetchData(metric,year){
  if(!isConfigured||!supabase){await new Promise(r=>setTimeout(r,120));return{rows:FALLBACK[metric][year],source:'fallback'}}
  try{
    const{data,error}=await supabase.from('eth_zone_metrics').select('zone_code,zone_name,region,lat,lon,value').eq('metric',metric).eq('year',year).order('zone_code')
    if(error)throw error
    if(!data||data.length===0)return{rows:FALLBACK[metric][year],source:'fallback'}
    return{rows:data,source:'supabase'}
  }catch(e){console.warn('Supabase fetch failed:',e.message);return{rows:FALLBACK[metric][year],source:'fallback'}}
}

/* ══ METRICS ════════════════════════════════════════════════════ */
const METRICS={
  income:{label:'Per Capita Income',unit:'ETB/yr',short:'Income',fmt:v=>`ETB ${Math.round(v).toLocaleString()}`,color:interpolateOranges,desc:'Annual household income per capita in Ethiopian Birr'},
  poverty:{label:'Poverty Rate',unit:'%',short:'Poverty',fmt:v=>`${v.toFixed(1)}%`,color:interpolateBlues,desc:'Share of population below national poverty line'},
  hdi:{label:'Human Dev. Index',unit:'0–1',short:'HDI',fmt:v=>v.toFixed(3),color:interpolateRdYlGn,desc:'Composite measure of life expectancy, education, and income'},
}

/* ══ GEO ════════════════════════════════════════════════════════ */
function makeGeoJSON(zones){
  return{type:'FeatureCollection',features:zones.map(z=>{
    const w=0.52+seed(z.z+'w')*0.55,h=0.42+seed(z.z+'h')*0.48,steps=24
    const coords=Array.from({length:steps+1},(_,i)=>{const a=(i/steps)*2*Math.PI;return[z.lon+Math.cos(a)*w,z.lat+Math.sin(a)*h]})
    return{type:'Feature',properties:{zone_code:z.z,zone_name:z.n,region:z.r},geometry:{type:'Polygon',coordinates:[coords]}}
  })}
}
const ETH_GEO=makeGeoJSON(RAW_ZONES)

function makeColorScale(domain,metric){
  return scaleQuantile().domain(domain).range(Array.from({length:8},(_,i)=>METRICS[metric].color(0.15+i/7*0.75)))
}

/* ══ CSS ════════════════════════════════════════════════════════ */
const CSS=`
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:${T.navy};overflow:hidden}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${T.navyMid}}::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
@keyframes pulse-ring{0%{transform:scale(.8);opacity:1}100%{transform:scale(2.4);opacity:0}}
@keyframes zone-flash{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes slide-in{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes fade-up{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
.flash{animation:zone-flash .7s ease-out}
.slide-in{animation:slide-in .32s cubic-bezier(.22,.68,0,1.2) both}
.fade-up{animation:fade-up .35s ease both}
.btn{padding:5px 14px;font-family:${T.sans};font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;border:1px solid ${T.border};background:transparent;color:${T.fog};transition:all .18s}
.btn.m:first-child{border-radius:3px 0 0 3px;border-right:none}.btn.m:last-child{border-radius:0 3px 3px 0}
.btn.active{background:${T.accent};border-color:${T.accent};color:#fff}
.btn.y{font-family:${T.mono};font-size:11px;border-radius:2px}
.btn.y.active{background:${T.gold};border-color:${T.gold};color:${T.navy};font-weight:500}
.btn:not(.active):hover{background:${T.navyLt};color:${T.mist};border-color:${T.fog}}
.kpi{flex:1;min-width:120px;padding:11px 18px;border-right:1px solid ${T.border};transition:background .2s}
.kpi:hover{background:${T.navyLt}}
.zone-row{display:flex;align-items:center;gap:8px;padding:6px 14px;border-bottom:1px solid ${T.border};cursor:pointer;transition:background .15s}
.zone-row:hover{background:${T.navyLt}}.zone-row.sel{background:rgba(232,71,42,.12);border-left:2px solid ${T.accent}}
`

/* ══ LIVE DOT ═══════════════════════════════════════════════════ */
function LiveDot({active}){
  return(
    <span style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',width:10,height:10,flexShrink:0}}>
      {active&&<span style={{position:'absolute',width:10,height:10,borderRadius:'50%',background:T.live,opacity:.4,animation:'pulse-ring 1.4s ease-out infinite'}}/>}
      <span style={{width:7,height:7,borderRadius:'50%',background:active?T.live:T.fog,transition:'background .4s'}}/>
    </span>
  )
}

/* ══ SPARKLINE ══════════════════════════════════════════════════ */
function Sparkline({zoneCode,metric,color,w=80,h=24}){
  const ref=useRef(null)
  useEffect(()=>{
    const c=ref.current;if(!c)return
    const vals=YEARS.map(y=>FALLBACK[metric][y].find(d=>d.zone_code===zoneCode)?.value??0)
    const ctx=c.getContext('2d');const lo=Math.min(...vals),hi=Math.max(...vals)
    ctx.clearRect(0,0,w*2,h*2);ctx.scale(2,2)
    ctx.beginPath()
    vals.forEach((v,i)=>{const x=i*(w/(vals.length-1)),y=h-((v-lo)/(hi-lo||1))*(h-5)-3;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)})
    ctx.lineTo((vals.length-1)*(w/(vals.length-1)),h);ctx.lineTo(0,h);ctx.closePath()
    ctx.fillStyle=color+'22';ctx.fill()
    ctx.beginPath()
    vals.forEach((v,i)=>{const x=i*(w/(vals.length-1)),y=h-((v-lo)/(hi-lo||1))*(h-5)-3;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)})
    ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.lineJoin='round';ctx.stroke()
    vals.forEach((v,i)=>{const x=i*(w/(vals.length-1)),y=h-((v-lo)/(hi-lo||1))*(h-5)-3;ctx.beginPath();ctx.arc(x,y,1.5,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()})
  },[zoneCode,metric,color,w,h])
  return<canvas ref={ref} width={w*2} height={h*2} style={{width:w,height:h,display:'block'}}/>
}

/* ══ LEGEND ═════════════════════════════════════════════════════ */
function Legend({colorScale,domain,metric}){
  const[lo,hi]=extent(domain);const m=METRICS[metric]
  return(
    <div style={{padding:'13px 14px 11px',borderBottom:`1px solid ${T.border}`}}>
      <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'.14em',color:T.fog,marginBottom:7}}>{m.label}</div>
      <div style={{display:'flex',height:6,borderRadius:3,overflow:'hidden',marginBottom:4}}>
        {Array.from({length:24},(_,i)=><div key={i} style={{flex:1,background:colorScale(lo+(hi-lo)*(i/23))}}/>)}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:9,fontFamily:T.mono,color:T.fog,marginBottom:6}}>
        <span>{m.fmt(lo)}</span><span>{m.fmt(hi)}</span>
      </div>
      <div style={{fontSize:9,color:T.fog,lineHeight:1.6,fontStyle:'italic'}}>{m.desc}</div>
    </div>
  )
}

/* ══ MAP ════════════════════════════════════════════════════════ */
function EthMap({data,metric,selected,onSelect,colorScale,flashZone}){
  const dataMap=useMemo(()=>Object.fromEntries(data.map(d=>[d.zone_code,d])),[data])
  return(
    <ComposableMap projection="geoMercator" projectionConfig={{center:[39.5,9.0],scale:1900}} style={{width:'100%',height:'100%'}}>
      <ZoomableGroup center={[39.5,9.0]} zoom={1} minZoom={0.7} maxZoom={12}>
        <Geographies geography={ETH_GEO}>
          {({geographies})=>geographies.map(geo=>{
            const zc=geo.properties.zone_code,zd=dataMap[zc],isSel=selected===zc,isFlash=flashZone===zc
            return(
              <Geography key={zc} geography={geo} className={isFlash?'flash':''}
                fill={zd?colorScale(zd.value):T.navyLt}
                stroke={isSel?'#fff':T.navy+'cc'} strokeWidth={isSel?1.8:.5}
                style={{
                  default:{outline:'none',opacity:isSel?1:.88,filter:isSel?'brightness(1.15)':'none'},
                  hover:{outline:'none',opacity:1,cursor:'pointer',filter:'brightness(1.2)'},
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

/* ══ RANKING ════════════════════════════════════════════════════ */
function RankingPanel({data,metric,selected,onSelect}){
  const sorted=useMemo(()=>[...data].sort((a,b)=>b.value-a.value),[data])
  const max=sorted[0]?.value??1,m=METRICS[metric]
  return(
    <div style={{overflowY:'auto',height:'100%',background:T.navyMid}}>
      <div style={{padding:'10px 14px 8px',fontSize:10,color:T.fog,fontStyle:'italic',borderBottom:`1px solid ${T.border}`,background:T.navy,position:'sticky',top:0}}>
        {data.length} zones — ranked by {m.label}
      </div>
      {sorted.map((d,i)=>(
        <div key={d.zone_code} className={`zone-row${selected===d.zone_code?' sel':''}`} onClick={()=>onSelect(selected===d.zone_code?null:d.zone_code)}>
          <span style={{fontFamily:T.mono,fontSize:9,color:T.fog,minWidth:20,textAlign:'right'}}>{i+1}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:T.mist,fontFamily:T.serif,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{d.zone_name}</div>
            <div style={{height:2,background:T.navyLt,borderRadius:1,marginTop:3}}>
              <div style={{height:'100%',width:`${(d.value/max)*100}%`,background:T.accent,borderRadius:1,transition:'width .4s ease'}}/>
            </div>
          </div>
          <span style={{fontFamily:T.mono,fontSize:10,color:T.gold,fontWeight:500,minWidth:72,textAlign:'right'}}>{m.fmt(d.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ══ ZONE DETAIL ════════════════════════════════════════════════ */
function ZoneDetail({zone,metric,year}){
  if(!zone)return(
    <div style={{padding:'24px 14px',color:T.fog,fontStyle:'italic',fontSize:11,lineHeight:1.8,textAlign:'center',marginTop:16}}>
      <div style={{fontSize:32,marginBottom:12,opacity:.2}}>◈</div>
      Click any zone on the map or ranking to explore its data
    </div>
  )
  return(
    <div className="fade-up" style={{padding:'13px',overflowY:'auto',flex:1}}>
      <div style={{marginBottom:13}}>
        <div style={{fontFamily:T.serif,fontWeight:700,fontSize:16,color:'#fff',lineHeight:1.25,marginBottom:4}}>{zone.zone_name}</div>
        <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'.12em',color:T.fog}}>{zone.region} Region</div>
      </div>
      <div style={{background:T.navyLt,border:`1px solid ${T.border}`,borderRadius:4,padding:'11px 13px',marginBottom:11}}>
        <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'.12em',color:T.fog,marginBottom:5}}>{METRICS[metric].label} · {year}</div>
        <div style={{fontFamily:T.mono,fontSize:22,color:T.accent,fontWeight:500,letterSpacing:'-.02em',marginBottom:6}}>{METRICS[metric].fmt(zone.value)}</div>
        <Sparkline zoneCode={zone.zone_code} metric={metric} color={T.accent} w={100} h={26}/>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:7,color:T.fog,fontFamily:T.mono,marginTop:2}}>
          {YEARS.map(y=><span key={y}>{y}</span>)}
        </div>
      </div>
      <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'.12em',color:T.fog,marginBottom:7}}>All indicators</div>
      {Object.entries(METRICS).map(([mk,m])=>{
        const val=FALLBACK[mk][year].find(d=>d.zone_code===zone.zone_code)?.value??0,isA=mk===metric
        return(
          <div key={mk} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${T.border}`}}>
            <div>
              <div style={{fontSize:8,color:isA?T.gold:T.fog,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:3}}>{m.short}</div>
              <Sparkline zoneCode={zone.zone_code} metric={mk} color={isA?T.gold:T.fog} w={52} h={18}/>
            </div>
            <span style={{fontFamily:T.mono,fontSize:12,color:isA?T.gold:T.mist,fontWeight:isA?500:400}}>{m.fmt(val)}</span>
          </div>
        )
      })}
      <div style={{marginTop:10,fontSize:8,color:T.fog,fontFamily:T.mono}}>{zone.zone_code} · {zone.lat?.toFixed(2)}°N {zone.lon?.toFixed(2)}°E</div>
    </div>
  )
}

/* ══ REALTIME FEED ══════════════════════════════════════════════ */
function RealtimeFeed({events}){
  if(!events.length)return null
  return(
    <div style={{borderTop:`1px solid ${T.border}`,padding:'8px 14px',maxHeight:130,overflowY:'auto',flexShrink:0}}>
      <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'.14em',color:T.live,marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
        <LiveDot active/>LIVE UPDATES
      </div>
      {events.slice(0,8).map((ev,i)=>(
        <div key={ev.id} className={i===0?'slide-in':''} style={{fontFamily:T.mono,fontSize:9,color:i===0?T.live:T.fog,padding:'2px 0',borderBottom:`1px solid ${T.border}`,display:'flex',gap:8,alignItems:'baseline',opacity:1-i*.1}}>
          <span style={{color:T.gold,flexShrink:0}}>{ev.time}</span>
          <span style={{color:T.mist,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{ev.zone_name}</span>
          <span style={{flexShrink:0}}>{ev.fmt}</span>
        </div>
      ))}
    </div>
  )
}

/* ══ APP ════════════════════════════════════════════════════════ */
export default function App(){
  const[metric,setMetric]=useState('income')
  const[year,setYear]=useState(2023)
  const[data,setData]=useState([])
  const[loading,setLoading]=useState(true)
  const[source,setSource]=useState('fallback')
  const[selected,setSelected]=useState(null)
  const[panel,setPanel]=useState('map')
  const[rtEvents,setRtEvents]=useState([])
  const[flashZone,setFlashZone]=useState(null)
  const[rtStatus,setRtStatus]=useState('connecting')

  useEffect(()=>{
    setLoading(true)
    fetchData(metric,year).then(({rows,source})=>{setData(rows);setSource(source);setLoading(false)})
  },[metric,year])

  useEffect(()=>{
    if(!isConfigured||!supabase){setRtStatus('off');return}
    setRtStatus('connecting')
    const channel=supabase.channel('eth-zone-metrics-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'eth_zone_metrics'},(payload)=>{
        const row=payload.new||payload.old;if(!row)return
        const now=new Date()
        const timeStr=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
        const newEv={
          id:`${Date.now()}-${Math.random()}`,time:timeStr,
          zone_code:row.zone_code,zone_name:row.zone_name||row.zone_code,
          metric:row.metric,year:row.year,value:row.value,
          fmt:row.value!=null?METRICS[row.metric]?.fmt(row.value)??String(row.value):'—',
          event:payload.eventType,
        }
        setRtEvents(prev=>[newEv,...prev].slice(0,20))
        if(row.metric===metric&&row.year===year){
          fetchData(metric,year).then(({rows,source})=>{setData(rows);setSource(source)})
          setFlashZone(row.zone_code)
          setTimeout(()=>setFlashZone(null),800)
        }
      })
      .subscribe(status=>{
        if(status==='SUBSCRIBED')setRtStatus('live')
        else if(status==='CLOSED'||status==='CHANNEL_ERROR')setRtStatus('error')
      })
    return()=>{supabase.removeChannel(channel)}
  },[metric,year])

  const domain=useMemo(()=>data.map(d=>d.value),[data])
  const colorScale=useMemo(()=>domain.length?makeColorScale(domain,metric):()=>T.navyLt,[domain,metric])
  const sorted=useMemo(()=>[...data].sort((a,b)=>b.value-a.value),[data])
  const natAvg=data.length?data.reduce((s,d)=>s+d.value,0)/data.length:0
  const selZone=selected?data.find(d=>d.zone_code===selected):null
  const rtColor=rtStatus==='live'?T.live:rtStatus==='error'?T.accent:T.fog

  return(
    <>
      <style>{CSS}</style>
      <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',fontFamily:T.sans,background:T.navy,color:'#fff'}}>

        {/* HEADER */}
        <header style={{borderBottom:`1px solid ${T.border}`,padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,background:T.navy,gap:16}}>
          <div style={{display:'flex',alignItems:'baseline',gap:14}}>
            <div style={{fontFamily:T.serif,fontSize:'clamp(14px,1.8vw,20px)',fontWeight:700,letterSpacing:'-.02em',color:'#fff',lineHeight:1.1}}>
              Ethiopia Income Atlas
            </div>
            <div style={{fontSize:8,color:T.fog,textTransform:'uppercase',letterSpacing:'.16em',borderLeft:`1px solid ${T.border}`,paddingLeft:12}}>
              Zone-level Welfare · {year}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <LiveDot active={rtStatus==='live'}/>
            <span style={{fontSize:8,color:rtColor,fontFamily:T.mono,letterSpacing:'.06em'}}>
              {rtStatus==='live'?'LIVE':rtStatus==='connecting'?'CONNECTING…':rtStatus==='error'?'RT ERROR':source==='supabase'?'SUPABASE':'BUILT-IN'}
            </span>
            {rtEvents.length>0&&(
              <span style={{fontFamily:T.mono,fontSize:8,background:T.live+'22',color:T.live,padding:'1px 6px',borderRadius:2,border:`1px solid ${T.live}44`}}>
                {rtEvents.length} update{rtEvents.length!==1?'s':''}
              </span>
            )}
          </div>
        </header>

        {/* CONTROLS */}
        <div style={{borderBottom:`1px solid ${T.border}`,padding:'7px 20px',display:'flex',alignItems:'center',gap:18,flexWrap:'wrap',background:T.navyMid,flexShrink:0}}>
          <div style={{display:'flex'}}>
            {Object.entries(METRICS).map(([k,m])=>(
              <button key={k} className={`btn m${metric===k?' active':''}`} onClick={()=>setMetric(k)}>{m.short}</button>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:8,textTransform:'uppercase',letterSpacing:'.14em',color:T.fog}}>Year</span>
            {YEARS.map(y=><button key={y} className={`btn y${year===y?' active':''}`} onClick={()=>setYear(y)}>{y}</button>)}
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:5}}>
            {['map','ranking'].map(p=><button key={p} className={`btn y${panel===p?' active':''}`} onClick={()=>setPanel(p)} style={{textTransform:'capitalize'}}>{p}</button>)}
          </div>
        </div>

        {/* KPI STRIP */}
        <div style={{display:'flex',borderBottom:`1px solid ${T.border}`,flexShrink:0,overflowX:'auto',background:T.navyMid}}>
          {[
            {label:'National average',val:METRICS[metric].fmt(natAvg),sub:METRICS[metric].unit},
            {label:'Highest zone',val:sorted[0]?METRICS[metric].fmt(sorted[0].value):'—',sub:sorted[0]?.zone_name??''},
            {label:'Lowest zone',val:sorted.at(-1)?METRICS[metric].fmt(sorted.at(-1).value):'—',sub:sorted.at(-1)?.zone_name??''},
            {label:'Zones tracked',val:data.length,sub:'ADM2 zones'},
          ].map((k,i)=>(
            <div key={i} className="kpi">
              <div style={{fontSize:7,textTransform:'uppercase',letterSpacing:'.16em',color:T.fog,marginBottom:3}}>{k.label}</div>
              <div style={{fontFamily:T.mono,fontSize:17,fontWeight:500,color:T.gold,lineHeight:1.2}}>{k.val}</div>
              <div style={{fontSize:9,color:T.fog,marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',fontStyle:'italic'}}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* BODY */}
        <div style={{display:'flex',flex:1,overflow:'hidden',minHeight:0}}>

          {/* Map / Ranking */}
          <div style={{flex:1,position:'relative',background:T.navyMid,overflow:'hidden'}}>
            {panel==='map'&&data.length>0&&<EthMap data={data} metric={metric} selected={selected} onSelect={setSelected} colorScale={colorScale} flashZone={flashZone}/>}
            {panel==='ranking'&&<RankingPanel data={data} metric={metric} selected={selected} onSelect={setSelected}/>}
            {loading&&(
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:T.navy+'dd',zIndex:10,gap:12}}>
                <div style={{width:20,height:20,border:`2px solid ${T.border}`,borderTop:`2px solid ${T.gold}`,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
                <span style={{fontSize:10,color:T.fog,fontFamily:T.mono,letterSpacing:'.1em'}}>LOADING…</span>
              </div>
            )}
            {panel==='map'&&!loading&&(
              <div style={{position:'absolute',bottom:8,left:10,fontSize:7,color:T.fog,fontFamily:T.mono,opacity:.55}}>
                Synthetic zone boundaries · Production: HDX geoBoundaries ETH ADM2
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <div style={{width:246,flexShrink:0,borderLeft:`1px solid ${T.border}`,background:T.navy,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <Legend colorScale={colorScale} domain={domain} metric={metric}/>
            <div style={{display:'flex',flexShrink:0}}>
              {['Zone detail','Overview'].map((t,i)=>{
                const active=i===0?!!selZone:!selZone
                return(
                  <button key={t} onClick={()=>i===1&&setSelected(null)} disabled={i===0&&!selZone}
                    style={{flex:1,padding:'7px',fontSize:8,textTransform:'uppercase',letterSpacing:'.1em',background:'transparent',border:'none',borderBottom:`2px solid ${active?T.accent:'transparent'}`,cursor:(i===0&&!selZone)?'default':'pointer',fontFamily:T.sans,color:active?'#fff':T.fog,transition:'all .15s'}}>
                    {t}
                  </button>
                )
              })}
            </div>
            <div style={{flex:1,overflowY:'auto',minHeight:0}}>
              <ZoneDetail zone={selZone} metric={metric} year={year}/>
            </div>
            <RealtimeFeed events={rtEvents}/>
            <div style={{padding:'7px 14px',borderTop:`1px solid ${T.border}`,fontSize:7,color:T.fog,lineHeight:1.7,flexShrink:0}}>
              <span style={{color:'rgba(255,255,255,.5)',fontWeight:500}}>Data</span> CSA HCES 2015–23 · World Bank 2020 · IFPRI<br/>
              <span style={{color:'rgba(255,255,255,.5)',fontWeight:500}}>Backend</span>{' '}
              <span style={{fontFamily:T.mono,fontSize:7,background:source==='supabase'?T.live+'22':T.navyLt,color:source==='supabase'?T.live:T.fog,padding:'1px 4px',borderRadius:2,border:`1px solid ${source==='supabase'?T.live+'44':T.border}`}}>
                {source==='supabase'?'SUPABASE LIVE':'BUILT-IN'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
