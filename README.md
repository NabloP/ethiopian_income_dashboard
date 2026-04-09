# Ethiopia Income Dashboard

Zone-level income, poverty, and HDI data across Ethiopia's administrative zones.
Built with React + Vite + Supabase + Vercel.

## Supabase setup

1. Go to your Supabase project → SQL Editor
2. Run the contents of `supabase/seed.sql`
3. Copy `.env.example` → `.env.local` and fill in your project URL and anon key

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Vercel env vars

In Vercel → Project Settings → Environment Variables, add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The dashboard gracefully falls back to built-in CSA/World Bank data
when Supabase is not configured, so it works immediately.

## Data sources

- CSA Ethiopia HCES 2015/16
- World Bank Ethiopia Poverty Assessment 2020
- IFPRI Zone Profiles
- Boundaries: HDX geoBoundaries ETH ADM2
