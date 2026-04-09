import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabase = url && key ? createClient(url, key) : null
export const isConfigured = Boolean(url && key)

// ITOS ArcGIS REST API — official UN OCHA COD-AB boundaries for Ethiopia
// This is the authoritative live source for Ethiopia ADM2 zone polygons
export const ITOS_ADM2_URL =
  'https://codgis.itos.uga.edu/arcgis/rest/services/COD_External/ETH_pcode/FeatureServer/2/query' +
  '?where=1%3D1&outFields=admin2Pcode%2Cadmin2Name_en%2Cadmin1Name_en&outSR=4326&f=geojson&resultRecordCount=200'
