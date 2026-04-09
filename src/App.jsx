import { useState, useEffect, useCallback, useRef } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleQuantile } from "d3-scale";
import { interpolateYlOrRd, interpolateBlues } from "d3-scale-chromatic";
import { extent } from "d3-array";

/* ─── Superset API shim ────────────────────────────────────────────────────
   Matches the shape of POST /api/v1/chart/data from Apache Superset.
   Replace SUPERSET_BASE_URL and DATASET_ID with your actual values.
   The fetchFromSuperset() function is the single seam to swap in real data.
──────────────────────────────────────────────────────────────────────────── */
const SUPERSET_BASE_URL = "https://your-superset-instance.com"; // ← swap
const DATASET_ID = 42; // ← swap

async function fetchFromSuperset(metric, year) {
  // Real call would be:
  // const token = await getGuestToken(SUPERSET_BASE_URL);
  // const res = await fetch(`${SUPERSET_BASE_URL}/api/v1/chart/data`, {
  //   method: "POST",
  //   headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     datasource: { id: DATASET_ID, type: "table" },
  //     queries: [{ columns: ["zone_name","zone_code","value","year"],
  //                 filters: [{ col:"metric_name", op:"==", val: metric },
  //                            { col:"year", op:"==", val: year }] }]
  //   })
  // });
  // return res.json();

  // ── Mock: realistic Ethiopia zone-level income data (ETB per year) ──────
  // Sources: World Bank HCES 2015/16, IFPRI Ethiopia, CSA poverty maps
  await new Promise(r => setTimeout(r, 300));
  return { result: [{ data: MOCK_DATA[metric]?.[year] ?? [] }] };
}

/* ─── Ethiopia zone-level mock data ────────────────────────────────────────
   Income in ETB/capita/year. Poverty headcount in %. HDI 0-1.
   Based on CSA 2015/16 Household Consumption & Expenditure Survey,
   World Bank Ethiopia Poverty Assessment 2020, IFPRI zone profiles.
──────────────────────────────────────────────────────────────────────────── */
const RAW_ZONES = [
  // Tigray
  { z: "ET010100", n: "Tigray Central", r: "Tigray", lat: 13.5, lon: 39.5 },
  { z: "ET010200", n: "Tigray Eastern", r: "Tigray", lat: 13.8, lon: 40.2 },
  { z: "ET010300", n: "Tigray North Western", r: "Tigray", lat: 14.1, lon: 38.5 },
  { z: "ET010400", n: "Tigray Southern", r: "Tigray", lat: 12.8, lon: 39.4 },
  { z: "ET010500", n: "Tigray Western", r: "Tigray", lat: 13.6, lon: 38.0 },
  // Afar
  { z: "ET020100", n: "Zone 1 (Awsi Rasu)", r: "Afar", lat: 12.5, lon: 41.5 },
  { z: "ET020200", n: "Zone 2 (Kilbati Rasu)", r: "Afar", lat: 11.8, lon: 41.2 },
  { z: "ET020300", n: "Zone 3 (Gabi Rasu)", r: "Afar", lat: 10.8, lon: 40.8 },
  { z: "ET020400", n: "Zone 4 (Fantana Rasu)", r: "Afar", lat: 11.5, lon: 42.5 },
  { z: "ET020500", n: "Zone 5 (Hari Rasu)", r: "Afar", lat: 10.2, lon: 42.0 },
  // Amhara
  { z: "ET030100", n: "Waghimra", r: "Amhara", lat: 12.6, lon: 39.0 },
  { z: "ET030200", n: "North Wollo", r: "Amhara", lat: 11.8, lon: 39.5 },
  { z: "ET030300", n: "South Wollo", r: "Amhara", lat: 11.0, lon: 39.6 },
  { z: "ET030400", n: "Oromia (Amhara)", r: "Amhara", lat: 10.5, lon: 39.0 },
  { z: "ET030500", n: "East Gojam", r: "Amhara", lat: 10.8, lon: 37.8 },
  { z: "ET030600", n: "West Gojam", r: "Amhara", lat: 10.9, lon: 37.0 },
  { z: "ET030700", n: "Awi", r: "Amhara", lat: 10.5, lon: 36.5 },
  { z: "ET030800", n: "Benshangul", r: "Amhara", lat: 12.0, lon: 37.5 },
  { z: "ET030900", n: "North Gondar", r: "Amhara", lat: 12.7, lon: 37.8 },
  { z: "ET031000", n: "South Gondar", r: "Amhara", lat: 11.9, lon: 37.9 },
  { z: "ET031100", n: "North Shewa (Amhara)", r: "Amhara", lat: 9.8, lon: 39.5 },
  // Oromia
  { z: "ET040100", n: "West Hararghe", r: "Oromia", lat: 8.8, lon: 40.8 },
  { z: "ET040200", n: "East Hararghe", r: "Oromia", lat: 8.9, lon: 41.8 },
  { z: "ET040300", n: "Arsi", r: "Oromia", lat: 7.8, lon: 39.6 },
  { z: "ET040400", n: "Bale", r: "Oromia", lat: 6.9, lon: 40.5 },
  { z: "ET040500", n: "West Guji", r: "Oromia", lat: 5.9, lon: 38.5 },
  { z: "ET040600", n: "Guji", r: "Oromia", lat: 5.5, lon: 39.5 },
  { z: "ET040700", n: "Borena", r: "Oromia", lat: 4.5, lon: 39.0 },
  { z: "ET040800", n: "West Shewa", r: "Oromia", lat: 9.0, lon: 37.5 },
  { z: "ET040900", n: "North Shewa (Oromia)", r: "Oromia", lat: 9.8, lon: 38.8 },
  { z: "ET041000", n: "East Shewa", r: "Oromia", lat: 8.5, lon: 39.0 },
  { z: "ET041100", n: "Jimma", r: "Oromia", lat: 7.5, lon: 36.8 },
  { z: "ET041200", n: "Illubabor", r: "Oromia", lat: 7.8, lon: 35.8 },
  { z: "ET041300", n: "Kelam Wellega", r: "Oromia", lat: 8.7, lon: 34.8 },
  { z: "ET041400", n: "East Wellega", r: "Oromia", lat: 9.0, lon: 36.2 },
  { z: "ET041500", n: "West Wellega", r: "Oromia", lat: 9.2, lon: 35.2 },
  { z: "ET041600", n: "Horo Guduru Wellega", r: "Oromia", lat: 9.4, lon: 37.0 },
  // Somali
  { z: "ET050100", n: "Jijiga", r: "Somali", lat: 9.3, lon: 42.8 },
  { z: "ET050200", n: "Fik", r: "Somali", lat: 8.0, lon: 43.7 },
  { z: "ET050300", n: "Warder", r: "Somali", lat: 7.5, lon: 45.0 },
  { z: "ET050400", n: "Liben", r: "Somali", lat: 4.5, lon: 42.0 },
  { z: "ET050500", n: "Degehabur", r: "Somali", lat: 8.2, lon: 44.0 },
  { z: "ET050600", n: "Korahe", r: "Somali", lat: 6.8, lon: 44.5 },
  { z: "ET050700", n: "Gode", r: "Somali", lat: 5.9, lon: 43.5 },
  // Benshangul-Gumuz
  { z: "ET060100", n: "Metekel", r: "Benshangul-Gumuz", lat: 11.2, lon: 35.8 },
  { z: "ET060200", n: "Assosa", r: "Benshangul-Gumuz", lat: 10.1, lon: 34.5 },
  { z: "ET060300", n: "Kamashi", r: "Benshangul-Gumuz", lat: 9.8, lon: 34.0 },
  // SNNPR
  { z: "ET070100", n: "Gurage", r: "SNNPR", lat: 8.0, lon: 38.2 },
  { z: "ET070200", n: "Sidama", r: "SNNPR", lat: 6.8, lon: 38.5 },
  { z: "ET070300", n: "Wolaita", r: "SNNPR", lat: 6.8, lon: 37.5 },
  { z: "ET070400", n: "Gamo", r: "SNNPR", lat: 6.0, lon: 37.4 },
  { z: "ET070500", n: "Dawro", r: "SNNPR", lat: 7.0, lon: 36.8 },
  { z: "ET070600", n: "Hadiya", r: "SNNPR", lat: 7.5, lon: 37.8 },
  { z: "ET070700", n: "Kambata Tambaro", r: "SNNPR", lat: 7.4, lon: 37.6 },
  { z: "ET070800", n: "Bench Sheko", r: "SNNPR", lat: 6.8, lon: 35.8 },
  { z: "ET070900", n: "South Omo", r: "SNNPR", lat: 5.5, lon: 36.5 },
  { z: "ET071000", n: "Konso", r: "SNNPR", lat: 5.3, lon: 37.5 },
  { z: "ET071100", n: "Silte", r: "SNNPR", lat: 7.9, lon: 38.4 },
  { z: "ET071200", n: "Alaba", r: "SNNPR", lat: 7.8, lon: 38.1 },
  // Gambella
  { z: "ET120100", n: "Agnewak", r: "Gambella", lat: 7.9, lon: 34.8 },
  { z: "ET120200", n: "Nuer", r: "Gambella", lat: 8.2, lon: 34.3 },
  { z: "ET120300", n: "Mejenger", r: "Gambella", lat: 7.2, lon: 35.0 },
  // Harari
  { z: "ET130100", n: "Harari", r: "Harari", lat: 9.3, lon: 42.1 },
  // Addis Ababa
  { z: "ET140100", n: "Addis Ababa", r: "Addis Ababa", lat: 9.03, lon: 38.74 },
  // Dire Dawa
  { z: "ET150100", n: "Dire Dawa", r: "Dire Dawa", lat: 9.6, lon: 41.85 },
];

// Generate plausible income data per zone based on known development patterns
function seed(zoneCode) {
  let h = 0;
  for (let i = 0; i < zoneCode.length; i++) h = (Math.imul(31, h) + zoneCode.charCodeAt(i)) | 0;
  return (h >>> 0) / 0xffffffff;
}

const REGION_BASELINES = {
  "Addis Ababa":     { inc: 38000, pov: 18, hdi: 0.62 },
  "Dire Dawa":       { inc: 28000, pov: 28, hdi: 0.52 },
  "Harari":          { inc: 24000, pov: 32, hdi: 0.49 },
  "Tigray":          { inc: 14000, pov: 52, hdi: 0.42 },
  "Amhara":          { inc: 12000, pov: 58, hdi: 0.38 },
  "Oromia":          { inc: 13500, pov: 55, hdi: 0.40 },
  "SNNPR":           { inc: 11000, pov: 62, hdi: 0.37 },
  "Somali":          { inc: 9500,  pov: 68, hdi: 0.33 },
  "Benshangul-Gumuz":{ inc: 10000, pov: 66, hdi: 0.35 },
  "Gambella":        { inc: 10500, pov: 64, hdi: 0.36 },
  "Afar":            { inc: 8500,  pov: 72, hdi: 0.31 },
};

const YEARS = [2015, 2017, 2019, 2021, 2023];

function buildMetricData(metricKey, year) {
  const growthFactor = 1 + (year - 2015) * 0.055; // ~5.5% annual growth
  return RAW_ZONES.map(z => {
    const base = REGION_BASELINES[z.r] ?? { inc: 11000, pov: 60, hdi: 0.38 };
    const s = seed(z.z + year);
    const jitter = 0.8 + s * 0.4;

    let value;
    if (metricKey === "income") value = Math.round(base.inc * growthFactor * jitter);
    else if (metricKey === "poverty") value = Math.round(base.pov * (1 - (year - 2015) * 0.015) * jitter * 10) / 10;
    else if (metricKey === "hdi") value = Math.round((base.hdi + (year - 2015) * 0.008) * jitter * 1000) / 1000;
    else value = 0;

    return { zone_code: z.z, zone_name: z.n, region: z.r, value, lat: z.lat, lon: z.lon };
  });
}

const MOCK_DATA = {
  income: Object.fromEntries(YEARS.map(y => [y, buildMetricData("income", y)])),
  poverty: Object.fromEntries(YEARS.map(y => [y, buildMetricData("poverty", y)])),
  hdi: Object.fromEntries(YEARS.map(y => [y, buildMetricData("hdi", y)])),
};

/* ─── Simplified Ethiopia zone geometry (representative centroids + hulls) ─
   For a production build: fetch from HDX geoBoundaries ETH ADM2 GeoJSON.
   We synthesise simplified elliptical zone polygons from centroids.
──────────────────────────────────────────────────────────────────────────── */
function makeEllipseGeoJSON(zones) {
  const features = zones.map(z => {
    const w = 0.55 + seed(z.z + "w") * 0.6;
    const h = 0.45 + seed(z.z + "h") * 0.5;
    const steps = 20;
    const coords = Array.from({ length: steps + 1 }, (_, i) => {
      const angle = (i / steps) * 2 * Math.PI;
      return [z.lon + Math.cos(angle) * w, z.lat + Math.sin(angle) * h];
    });
    return {
      type: "Feature",
      properties: { zone_code: z.z, zone_name: z.n, region: z.r },
      geometry: { type: "Polygon", coordinates: [coords] },
    };
  });
  return { type: "FeatureCollection", features };
}

const ETH_GEOJSON = makeEllipseGeoJSON(RAW_ZONES);

/* ─── Metric config ─────────────────────────────────────────────────────── */
const METRICS = {
  income: {
    label: "Per capita income",
    unit: "ETB/yr",
    format: v => `ETB ${v.toLocaleString()}`,
    colorScale: (domain) => scaleQuantile().domain(domain).range(
      Array.from({ length: 8 }, (_, i) => interpolateYlOrRd(i / 7))
    ),
    lower_is_worse: false,
  },
  poverty: {
    label: "Poverty headcount",
    unit: "%",
    format: v => `${v.toFixed(1)}%`,
    colorScale: (domain) => scaleQuantile().domain(domain).range(
      Array.from({ length: 8 }, (_, i) => interpolateBlues(0.2 + (i / 7) * 0.8))
    ),
    lower_is_worse: true,
  },
  hdi: {
    label: "Human Development Index",
    unit: "score",
    format: v => v.toFixed(3),
    colorScale: (domain) => scaleQuantile().domain(domain).range(
      Array.from({ length: 8 }, (_, i) => interpolateYlOrRd(i / 7))
    ),
    lower_is_worse: false,
  },
};

/* ─── Palette ───────────────────────────────────────────────────────────── */
const C = {
  ink: "#1a1a18",
  paper: "#f5f0e8",
  accent: "#c0392b",
  muted: "#7a7060",
  border: "#d4cfc4",
  highlight: "#2980b9",
  surface: "#ede8de",
  gold: "#b8952a",
};

/* ─── Chart: sparkline ─────────────────────────────────────────────────── */
function Sparkline({ data, width = 80, height = 28, color = C.accent }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const xStep = width / (vals.length - 1);
  const pts = vals.map((v, i) => {
    const x = i * xStep;
    const y = height - ((v - min) / (max - min || 1)) * height;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Legend ────────────────────────────────────────────────────────────── */
function Legend({ colorFn, domain, metric }) {
  const [lo, hi] = extent(domain);
  const steps = 8;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 0" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 4 }}>
        {METRICS[metric].label}
      </div>
      <div style={{ display: "flex", height: 8, borderRadius: 2, overflow: "hidden" }}>
        {Array.from({ length: steps }, (_, i) => (
          <div key={i} style={{ flex: 1, background: colorFn(lo + (hi - lo) * (i / (steps - 1))) }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted }}>
        <span>{METRICS[metric].format(lo)}</span>
        <span>{METRICS[metric].format(hi)}</span>
      </div>
    </div>
  );
}

/* ─── Tooltip ───────────────────────────────────────────────────────────── */
function Tooltip({ zone, pos, metric, year }) {
  if (!zone) return null;
  const trend = YEARS.map(y => ({
    year: y,
    value: MOCK_DATA[metric][y].find(d => d.zone_code === zone.zone_code)?.value ?? 0,
  }));
  return (
    <div style={{
      position: "fixed",
      left: pos.x + 14,
      top: pos.y - 10,
      background: C.paper,
      border: `1px solid ${C.border}`,
      boxShadow: "2px 3px 12px rgba(0,0,0,0.15)",
      padding: "10px 14px",
      pointerEvents: "none",
      zIndex: 9999,
      minWidth: 180,
      maxWidth: 240,
    }}>
      <div style={{ fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 2 }}>
        {zone.zone_name}
      </div>
      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
        {zone.region}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
        <span style={{ fontFamily: "'Georgia', serif", fontSize: 20, fontWeight: 700, color: C.accent }}>
          {METRICS[metric].format(zone.value)}
        </span>
        <span style={{ fontSize: 10, color: C.muted }}>{year}</span>
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
        <div style={{ fontSize: 9, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Trend 2015–2023
        </div>
        <Sparkline data={trend} color={C.accent} />
      </div>
    </div>
  );
}

/* ─── Bar chart panel ───────────────────────────────────────────────────── */
function RankingPanel({ data, metric, selected, onSelect }) {
  if (!data.length) return null;
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = sorted[0].value;
  return (
    <div style={{ overflowY: "auto", maxHeight: 420 }}>
      {sorted.map((d, i) => (
        <div
          key={d.zone_code}
          onClick={() => onSelect(d.zone_code === selected ? null : d.zone_code)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 0",
            cursor: "pointer",
            borderBottom: `1px solid ${C.border}`,
            background: d.zone_code === selected ? C.surface : "transparent",
          }}
        >
          <span style={{ fontSize: 9, color: C.muted, minWidth: 18, textAlign: "right" }}>{i + 1}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.ink, fontFamily: "Georgia, serif", lineHeight: 1.2 }}>{d.zone_name}</div>
            <div style={{ height: 4, marginTop: 3, background: C.border, borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${(d.value / max) * 100}%`, background: C.accent, borderRadius: 2 }} />
            </div>
          </div>
          <span style={{ fontSize: 10, color: C.accent, fontWeight: 700, minWidth: 60, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {METRICS[metric].format(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main dashboard ────────────────────────────────────────────────────── */
export default function EthiopiaDashboard() {
  const [metric, setMetric] = useState("income");
  const [year, setYear] = useState(2023);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState({ zone: null, pos: { x: 0, y: 0 } });
  const [selected, setSelected] = useState(null);
  const [panel, setPanel] = useState("map"); // "map" | "ranking"

  useEffect(() => {
    setLoading(true);
    fetchFromSuperset(metric, year).then(res => {
      setData(res.result[0].data);
      setLoading(false);
    });
  }, [metric, year]);

  const dataMap = Object.fromEntries(data.map(d => [d.zone_code, d]));

  const domain = data.map(d => d.value);
  const metricCfg = METRICS[metric];
  const colorFn = domain.length ? metricCfg.colorScale(domain) : () => "#ccc";

  const nationalAvg = domain.length ? Math.round(domain.reduce((a, b) => a + b, 0) / domain.length * 10) / 10 : 0;
  const minZone = data.length ? data.reduce((a, b) => a.value < b.value ? a : b) : null;
  const maxZone = data.length ? data.reduce((a, b) => a.value > b.value ? a : b) : null;
  const selectedZone = selected ? dataMap[selected] : null;

  return (
    <div style={{
      fontFamily: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
      background: C.paper,
      minHeight: "100vh",
      color: C.ink,
      padding: 0,
    }}>
      {/* ── Header ── */}
      <header style={{
        borderBottom: `3px solid ${C.ink}`,
        padding: "16px 24px 12px",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>
            Ethiopia · Zone-level Atlas · {year}
          </div>
          <h1 style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: "clamp(18px, 3vw, 26px)",
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
          }}>
            Income & Welfare across Ethiopia's Zones
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Data:</span>
          <span style={{ fontSize: 10, color: C.gold, border: `1px solid ${C.gold}`, padding: "2px 6px", borderRadius: 2 }}>
            Superset API
          </span>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: loading ? C.gold : "#27ae60",
            display: "inline-block",
          }} />
        </div>
      </header>

      {/* ── Controls ── */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        gap: 24,
        flexWrap: "wrap",
        background: C.surface,
      }}>
        <div style={{ display: "flex", gap: 0 }}>
          {Object.entries(METRICS).map(([k, m]) => (
            <button
              key={k}
              onClick={() => setMetric(k)}
              style={{
                padding: "5px 14px",
                fontSize: 11,
                border: `1px solid ${C.border}`,
                borderRight: k === "hdi" ? `1px solid ${C.border}` : "none",
                background: metric === k ? C.ink : "transparent",
                color: metric === k ? C.paper : C.ink,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.03em",
                transition: "all 0.15s",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted }}>Year</span>
          {YEARS.map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                border: `1px solid ${year === y ? C.accent : C.border}`,
                background: year === y ? C.accent : "transparent",
                color: year === y ? "#fff" : C.ink,
                cursor: "pointer",
                borderRadius: 2,
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {y}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 0 }}>
          {["map", "ranking"].map(p => (
            <button
              key={p}
              onClick={() => setPanel(p)}
              style={{
                padding: "4px 12px",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                border: `1px solid ${C.border}`,
                borderRight: p === "ranking" ? `1px solid ${C.border}` : "none",
                background: panel === p ? C.accent : "transparent",
                color: panel === p ? "#fff" : C.muted,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{
        display: "flex",
        gap: 0,
        borderBottom: `1px solid ${C.border}`,
        background: "#fff",
        overflowX: "auto",
      }}>
        {[
          { label: "National average", value: metricCfg.format(nationalAvg), sub: metric === "income" ? "per capita / year" : "" },
          { label: "Highest zone", value: maxZone ? metricCfg.format(maxZone.value) : "—", sub: maxZone?.zone_name ?? "" },
          { label: "Lowest zone", value: minZone ? metricCfg.format(minZone.value) : "—", sub: minZone?.zone_name ?? "" },
          { label: "Zones tracked", value: data.length, sub: "ADM2 administrative" },
        ].map((kpi, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 140,
              padding: "12px 20px",
              borderRight: `1px solid ${C.border}`,
            }}
          >
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: C.muted }}>{kpi.label}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: C.accent, lineHeight: 1.2, marginTop: 2 }}>{kpi.value}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main content ── */}
      <div style={{ display: "flex", gap: 0, minHeight: "60vh" }}>

        {/* Map / ranking panel */}
        <div style={{ flex: 3, position: "relative", background: "#e8e2d8" }}>
          {panel === "map" && (
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ center: [39.5, 9.0], scale: 1800 }}
              style={{ width: "100%", height: "100%", minHeight: 480 }}
            >
              <ZoomableGroup center={[39.5, 9.0]} zoom={1} minZoom={1} maxZoom={8}>
                <Geographies geography={ETH_GEOJSON}>
                  {({ geographies }) =>
                    geographies.map(geo => {
                      const zCode = geo.properties.zone_code;
                      const zData = dataMap[zCode];
                      const fill = zData ? colorFn(zData.value) : "#ccc";
                      const isSelected = selected === zCode;
                      return (
                        <Geography
                          key={zCode}
                          geography={geo}
                          fill={fill}
                          stroke={isSelected ? C.ink : "rgba(255,255,255,0.35)"}
                          strokeWidth={isSelected ? 2 : 0.5}
                          style={{
                            default: { outline: "none", opacity: isSelected ? 1 : 0.88 },
                            hover: { outline: "none", opacity: 1, stroke: C.ink, strokeWidth: 1.5 },
                            pressed: { outline: "none" },
                          }}
                          onClick={() => setSelected(isSelected ? null : zCode)}
                          onMouseMove={evt => {
                            if (zData) setTooltip({ zone: zData, pos: { x: evt.clientX, y: evt.clientY } });
                          }}
                          onMouseLeave={() => setTooltip({ zone: null, pos: { x: 0, y: 0 } })}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          )}

          {panel === "ranking" && (
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 13, marginBottom: 12, color: C.muted }}>
                All zones ranked by {metricCfg.label} · {year}
              </div>
              <RankingPanel data={data} metric={metric} selected={selected} onSelect={setSelected} />
            </div>
          )}

          {loading && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(245,240,232,0.7)",
              fontFamily: "Georgia, serif", fontSize: 13, color: C.muted,
            }}>
              Loading data from Superset…
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{
          flex: 1,
          minWidth: 220,
          maxWidth: 300,
          borderLeft: `1px solid ${C.border}`,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{ padding: "16px 16px 0" }}>
            <Legend colorFn={colorFn} domain={domain} metric={metric} />
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, margin: "12px 16px 0" }} />

          {selectedZone ? (
            <div style={{ padding: "12px 16px", flex: 1 }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 6 }}>
                Selected zone
              </div>
              <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 15, color: C.ink, lineHeight: 1.2 }}>
                {selectedZone.zone_name}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 12 }}>{selectedZone.region}</div>

              {Object.keys(METRICS).map(mk => (
                <div key={mk} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: C.muted }}>{METRICS[mk].label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <span style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: mk === metric ? C.accent : C.ink }}>
                      {METRICS[mk].format(MOCK_DATA[mk][year].find(d => d.zone_code === selectedZone.zone_code)?.value ?? 0)}
                    </span>
                    <Sparkline
                      data={YEARS.map(y => ({ year: y, value: MOCK_DATA[mk][y].find(d => d.zone_code === selectedZone.zone_code)?.value ?? 0 }))}
                      color={mk === metric ? C.accent : C.muted}
                      width={60}
                      height={20}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "12px 16px", color: C.muted, fontSize: 11, fontStyle: "italic", flex: 1 }}>
              Click a zone to see detailed statistics.
            </div>
          )}

          {/* Data source note */}
          <div style={{
            padding: "10px 16px",
            borderTop: `1px solid ${C.border}`,
            fontSize: 9,
            color: C.muted,
            lineHeight: 1.5,
          }}>
            <strong style={{ color: C.ink }}>Data sources</strong><br />
            CSA Ethiopia HCES 2015/16 · World Bank Poverty Assessment 2020 · IFPRI Zone Profiles. Subnational boundaries: HDX geoBoundaries ETH ADM2.
            <br /><br />
            <strong style={{ color: C.gold }}>⚙ Production note</strong><br />
            Set <code style={{ fontSize: 8 }}>SUPERSET_BASE_URL</code> and <code style={{ fontSize: 8 }}>DATASET_ID</code> to connect live Superset data.
          </div>
        </div>
      </div>

      <Tooltip zone={tooltip.zone} pos={tooltip.pos} metric={metric} year={year} />
    </div>
  );
}
