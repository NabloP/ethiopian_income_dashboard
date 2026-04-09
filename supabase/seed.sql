-- ═══════════════════════════════════════════════════════════════
--  Ethiopia Income Dashboard — Full Schema + Seed
--  Run this entire script in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── Zone metadata table (replaces hardcoded JS) ──────────────
CREATE TABLE IF NOT EXISTS eth_zones (
  zone_code  TEXT    PRIMARY KEY,
  zone_name  TEXT    NOT NULL,
  region     TEXT    NOT NULL,
  lat        FLOAT   NOT NULL,
  lon        FLOAT   NOT NULL
);

ALTER TABLE eth_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON eth_zones FOR SELECT USING (true);

INSERT INTO eth_zones (zone_code, zone_name, region, lat, lon) VALUES
('ET010100','Tigray Central','Tigray',13.5,39.5),
('ET010200','Tigray Eastern','Tigray',13.8,40.2),
('ET010300','Tigray NW','Tigray',14.1,38.5),
('ET010400','Tigray Southern','Tigray',12.8,39.4),
('ET010500','Tigray Western','Tigray',13.6,38.0),
('ET020100','Awsi Rasu','Afar',12.5,41.5),
('ET020200','Kilbati Rasu','Afar',11.8,41.2),
('ET020300','Gabi Rasu','Afar',10.8,40.8),
('ET020400','Fantana Rasu','Afar',11.5,42.5),
('ET020500','Hari Rasu','Afar',10.2,42.0),
('ET030100','Waghimra','Amhara',12.6,39.0),
('ET030200','North Wollo','Amhara',11.8,39.5),
('ET030300','South Wollo','Amhara',11.0,39.6),
('ET030500','East Gojam','Amhara',10.8,37.8),
('ET030600','West Gojam','Amhara',10.9,37.0),
('ET030700','Awi','Amhara',10.5,36.5),
('ET030900','North Gondar','Amhara',12.7,37.8),
('ET031000','South Gondar','Amhara',11.9,37.9),
('ET031100','North Shewa (Amhara)','Amhara',9.8,39.5),
('ET040100','West Hararghe','Oromia',8.8,40.8),
('ET040200','East Hararghe','Oromia',8.9,41.8),
('ET040300','Arsi','Oromia',7.8,39.6),
('ET040400','Bale','Oromia',6.9,40.5),
('ET040500','West Guji','Oromia',5.9,38.5),
('ET040700','Borena','Oromia',4.5,39.0),
('ET040800','West Shewa','Oromia',9.0,37.5),
('ET040900','North Shewa (Oromia)','Oromia',9.8,38.8),
('ET041000','East Shewa','Oromia',8.5,39.0),
('ET041100','Jimma','Oromia',7.5,36.8),
('ET041200','Illubabor','Oromia',7.8,35.8),
('ET041300','Kelam Wellega','Oromia',8.7,34.8),
('ET041400','East Wellega','Oromia',9.0,36.2),
('ET041500','West Wellega','Oromia',9.2,35.2),
('ET050100','Jijiga','Somali',9.3,42.8),
('ET050200','Fik','Somali',8.0,43.7),
('ET050300','Warder','Somali',7.5,45.0),
('ET050400','Liben','Somali',4.5,42.0),
('ET050500','Degehabur','Somali',8.2,44.0),
('ET050600','Korahe','Somali',6.8,44.5),
('ET050700','Gode','Somali',5.9,43.5),
('ET060100','Metekel','Benshangul-Gumuz',11.2,35.8),
('ET060200','Assosa','Benshangul-Gumuz',10.1,34.5),
('ET060300','Kamashi','Benshangul-Gumuz',9.8,34.0),
('ET070100','Gurage','SNNPR',8.0,38.2),
('ET070200','Sidama','SNNPR',6.8,38.5),
('ET070300','Wolaita','SNNPR',6.8,37.5),
('ET070400','Gamo','SNNPR',6.0,37.4),
('ET070500','Dawro','SNNPR',7.0,36.8),
('ET070600','Hadiya','SNNPR',7.5,37.8),
('ET070700','Kambata Tambaro','SNNPR',7.4,37.6),
('ET070800','Bench Sheko','SNNPR',6.8,35.8),
('ET070900','South Omo','SNNPR',5.5,36.5),
('ET120100','Agnewak','Gambella',7.9,34.8),
('ET120200','Nuer','Gambella',8.2,34.3),
('ET130100','Harari','Harari',9.3,42.1),
('ET140100','Addis Ababa','Addis Ababa',9.03,38.74),
('ET150100','Dire Dawa','Dire Dawa',9.6,41.85)
ON CONFLICT (zone_code) DO UPDATE SET zone_name=EXCLUDED.zone_name, region=EXCLUDED.region, lat=EXCLUDED.lat, lon=EXCLUDED.lon;

-- ── Metrics table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eth_zone_metrics (
  id         BIGSERIAL PRIMARY KEY,
  zone_code  TEXT    NOT NULL REFERENCES eth_zones(zone_code),
  metric     TEXT    NOT NULL CHECK (metric IN ('income','poverty','hdi')),
  year       INTEGER NOT NULL,
  value      FLOAT   NOT NULL,
  UNIQUE (zone_code, metric, year)
);

CREATE INDEX IF NOT EXISTS idx_eth_zone_metrics_lookup ON eth_zone_metrics (metric, year);

ALTER TABLE eth_zone_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON eth_zone_metrics FOR SELECT USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE eth_zone_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE eth_zones;

-- ── Seed metrics (2023 data) ──────────────────────────────────
INSERT INTO eth_zone_metrics (zone_code, metric, year, value) VALUES
-- Income 2023 (ETB/yr)
('ET140100','income',2023,49200),('ET150100','income',2023,36100),
('ET130100','income',2023,31000),('ET010100','income',2023,18100),
('ET010200','income',2023,16800),('ET010300','income',2023,15200),
('ET010400','income',2023,14900),('ET010500','income',2023,15800),
('ET020100','income',2023,11000),('ET020200','income',2023,10200),
('ET020300','income',2023,9800), ('ET020400','income',2023,10500),
('ET020500','income',2023,9200), ('ET030100','income',2023,13500),
('ET030200','income',2023,14200),('ET030300','income',2023,13800),
('ET030500','income',2023,15100),('ET030600','income',2023,14800),
('ET030700','income',2023,13200),('ET030900','income',2023,16200),
('ET031000','income',2023,15500),('ET031100','income',2023,17800),
('ET040100','income',2023,17500),('ET040200','income',2023,16900),
('ET040300','income',2023,18200),('ET040400','income',2023,14600),
('ET040500','income',2023,13800),('ET040700','income',2023,11500),
('ET040800','income',2023,17200),('ET040900','income',2023,18500),
('ET041000','income',2023,17800),('ET041100','income',2023,19200),
('ET041200','income',2023,16500),('ET041300','income',2023,15200),
('ET041400','income',2023,16800),('ET041500','income',2023,15900),
('ET050100','income',2023,12300),('ET050200','income',2023,10800),
('ET050300','income',2023,9500), ('ET050400','income',2023,9100),
('ET050500','income',2023,10200),('ET050600','income',2023,9800),
('ET050700','income',2023,10500),('ET060100','income',2023,11800),
('ET060200','income',2023,12200),('ET060300','income',2023,11500),
('ET070100','income',2023,15200),('ET070200','income',2023,14200),
('ET070300','income',2023,13500),('ET070400','income',2023,12800),
('ET070500','income',2023,12200),('ET070600','income',2023,13800),
('ET070700','income',2023,13200),('ET070800','income',2023,11800),
('ET070900','income',2023,10500),('ET120100','income',2023,11200),
('ET120200','income',2023,10800),
-- Poverty 2023 (%)
('ET140100','poverty',2023,14.2),('ET150100','poverty',2023,21.8),
('ET130100','poverty',2023,28.5),('ET010100','poverty',2023,48.2),
('ET010200','poverty',2023,51.5),('ET010300','poverty',2023,53.1),
('ET010400','poverty',2023,52.8),('ET010500','poverty',2023,50.2),
('ET020100','poverty',2023,65.3),('ET020200','poverty',2023,68.1),
('ET020300','poverty',2023,70.2),('ET020400','poverty',2023,66.8),
('ET020500','poverty',2023,72.5),('ET030100','poverty',2023,55.2),
('ET030200','poverty',2023,53.8),('ET030300','poverty',2023,54.5),
('ET030500','poverty',2023,51.2),('ET030600','poverty',2023,52.8),
('ET030700','poverty',2023,56.1),('ET030900','poverty',2023,48.5),
('ET031000','poverty',2023,50.2),('ET031100','poverty',2023,44.8),
('ET040100','poverty',2023,42.5),('ET040200','poverty',2023,44.1),
('ET040300','poverty',2023,40.2),('ET040400','poverty',2023,47.8),
('ET040500','poverty',2023,52.1),('ET040700','poverty',2023,61.5),
('ET040800','poverty',2023,41.8),('ET040900','poverty',2023,39.5),
('ET041000','poverty',2023,41.2),('ET041100','poverty',2023,38.5),
('ET041200','poverty',2023,44.2),('ET041300','poverty',2023,48.5),
('ET041400','poverty',2023,43.8),('ET041500','poverty',2023,46.2),
('ET050100','poverty',2023,58.2),('ET050200','poverty',2023,64.5),
('ET050300','poverty',2023,71.2),('ET050400','poverty',2023,73.8),
('ET050500','poverty',2023,65.8),('ET050600','poverty',2023,68.2),
('ET050700','poverty',2023,66.5),('ET060100','poverty',2023,60.2),
('ET060200','poverty',2023,58.5),('ET060300','poverty',2023,61.8),
('ET070100','poverty',2023,48.5),('ET070200','poverty',2023,52.1),
('ET070300','poverty',2023,54.8),('ET070400','poverty',2023,57.2),
('ET070500','poverty',2023,59.5),('ET070600','poverty',2023,52.8),
('ET070700','poverty',2023,54.2),('ET070800','poverty',2023,62.5),
('ET070900','poverty',2023,67.8),('ET120100','poverty',2023,62.1),
('ET120200','poverty',2023,64.8),
-- HDI 2023
('ET140100','hdi',2023,0.641),('ET150100','hdi',2023,0.541),
('ET130100','hdi',2023,0.498),('ET010100','hdi',2023,0.425),
('ET010200','hdi',2023,0.412),('ET010300','hdi',2023,0.398),
('ET010400','hdi',2023,0.402),('ET010500','hdi',2023,0.415),
('ET020100','hdi',2023,0.318),('ET020200','hdi',2023,0.305),
('ET020300','hdi',2023,0.298),('ET020400','hdi',2023,0.312),
('ET020500','hdi',2023,0.289),('ET030100','hdi',2023,0.378),
('ET030200','hdi',2023,0.385),('ET030300','hdi',2023,0.381),
('ET030500','hdi',2023,0.392),('ET030600','hdi',2023,0.388),
('ET030700','hdi',2023,0.372),('ET030900','hdi',2023,0.405),
('ET031000','hdi',2023,0.398),('ET031100','hdi',2023,0.425),
('ET040100','hdi',2023,0.418),('ET040200','hdi',2023,0.412),
('ET040300','hdi',2023,0.428),('ET040400','hdi',2023,0.395),
('ET040500','hdi',2023,0.382),('ET040700','hdi',2023,0.352),
('ET040800','hdi',2023,0.422),('ET040900','hdi',2023,0.432),
('ET041000','hdi',2023,0.428),('ET041100','hdi',2023,0.445),
('ET041200','hdi',2023,0.408),('ET041300','hdi',2023,0.388),
('ET041400','hdi',2023,0.412),('ET041500','hdi',2023,0.402),
('ET050100','hdi',2023,0.342),('ET050200','hdi',2023,0.318),
('ET050300','hdi',2023,0.301),('ET050400','hdi',2023,0.292),
('ET050500','hdi',2023,0.315),('ET050600','hdi',2023,0.308),
('ET050700','hdi',2023,0.322),('ET060100','hdi',2023,0.358),
('ET060200','hdi',2023,0.365),('ET060300','hdi',2023,0.352),
('ET070100','hdi',2023,0.392),('ET070200','hdi',2023,0.378),
('ET070300','hdi',2023,0.368),('ET070400','hdi',2023,0.355),
('ET070500','hdi',2023,0.348),('ET070600','hdi',2023,0.372),
('ET070700','hdi',2023,0.365),('ET070800','hdi',2023,0.342),
('ET070900','hdi',2023,0.318),('ET120100','hdi',2023,0.355),
('ET120200','hdi',2023,0.342)
ON CONFLICT (zone_code, metric, year) DO UPDATE SET value=EXCLUDED.value;

-- ── Verification ──────────────────────────────────────────────
SELECT 'zones' as tbl, COUNT(*) FROM eth_zones
UNION ALL SELECT 'metrics', COUNT(*) FROM eth_zone_metrics;
