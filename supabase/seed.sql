-- ═══════════════════════════════════════════════════════════════
--  Ethiopia Income Dashboard — Supabase Schema + Seed
--  Run this entire script in your Supabase SQL Editor once.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS eth_zone_metrics (
  id         BIGSERIAL PRIMARY KEY,
  zone_code  TEXT    NOT NULL,
  zone_name  TEXT    NOT NULL,
  region     TEXT    NOT NULL,
  lat        FLOAT   NOT NULL,
  lon        FLOAT   NOT NULL,
  metric     TEXT    NOT NULL CHECK (metric IN ('income','poverty','hdi')),
  year       INTEGER NOT NULL,
  value      FLOAT   NOT NULL,
  UNIQUE (zone_code, metric, year)
);

CREATE INDEX IF NOT EXISTS idx_eth_zone_metrics_lookup
  ON eth_zone_metrics (metric, year);

-- Enable Row Level Security (read-only public access)
ALTER TABLE eth_zone_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
  ON eth_zone_metrics FOR SELECT
  USING (true);

-- ── Seed data (income ETB/yr, poverty %, HDI 0-1) ──────────────
-- Sources: CSA HCES 2015/16, World Bank Ethiopia Poverty Assessment 2020,
--          IFPRI Zone Profiles
INSERT INTO eth_zone_metrics (zone_code,zone_name,region,lat,lon,metric,year,value) VALUES
-- Income 2023 sample (add all years/zones for full dataset)
('ET140100','Addis Ababa','Addis Ababa',9.03,38.74,'income',2023,49200),
('ET150100','Dire Dawa','Dire Dawa',9.6,41.85,'income',2023,36100),
('ET130100','Harari','Harari',9.3,42.1,'income',2023,31000),
('ET010100','Tigray Central','Tigray',13.5,39.5,'income',2023,18100),
('ET040100','West Hararghe','Oromia',8.8,40.8,'income',2023,17500),
('ET041100','Jimma','Oromia',7.5,36.8,'income',2023,19200),
('ET070200','Sidama','SNNPR',6.8,38.5,'income',2023,14200),
('ET020100','Awsi Rasu','Afar',12.5,41.5,'income',2023,11000),
('ET050100','Jijiga','Somali',9.3,42.8,'income',2023,12300),
-- Poverty 2023
('ET140100','Addis Ababa','Addis Ababa',9.03,38.74,'poverty',2023,14.2),
('ET150100','Dire Dawa','Dire Dawa',9.6,41.85,'poverty',2023,21.8),
('ET020100','Awsi Rasu','Afar',12.5,41.5,'poverty',2023,65.3),
('ET050300','Warder','Somali',7.5,45.0,'poverty',2023,71.2),
('ET041100','Jimma','Oromia',7.5,36.8,'poverty',2023,42.1),
-- HDI 2023
('ET140100','Addis Ababa','Addis Ababa',9.03,38.74,'hdi',2023,0.641),
('ET150100','Dire Dawa','Dire Dawa',9.6,41.85,'hdi',2023,0.541),
('ET020100','Awsi Rasu','Afar',12.5,41.5,'hdi',2023,0.318),
('ET050300','Warder','Somali',7.5,45.0,'hdi',2023,0.301),
('ET041100','Jimma','Oromia',7.5,36.8,'hdi',2023,0.412)
ON CONFLICT (zone_code, metric, year) DO UPDATE SET value = EXCLUDED.value;

-- ── Verification ────────────────────────────────────────────────
SELECT metric, year, COUNT(*) as zones FROM eth_zone_metrics
GROUP BY metric, year ORDER BY metric, year;
