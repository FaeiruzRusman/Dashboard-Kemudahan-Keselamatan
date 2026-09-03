# Dashboard Kemudahan Keselamatan Negeri Selangor V1.0

Master dataset finalized from the user-reviewed PDRM, JBPM and APM datasets.

## Record count
- PDRM: 137
- JBPM: 37
- APM: 10
- Total: 184

## GIS outputs
- `gis/Kemudahan_Keselamatan_Selangor_Master.gpkg`
  - `keselamatan_polygon` (EPSG:3380)
  - `keselamatan_point` (EPSG:3380, centroid derived)
- `gis/shapefile_polygon/` — consolidated polygon shapefile
- `gis/shapefile_point/` — centroid point shapefile
- `data/keselamatan_polygon_wgs84.geojson` — web-ready polygon GeoJSON
- `data/keselamatan_point_wgs84.geojson` — web-ready point GeoJSON
- `data/master_kemudahan_keselamatan.csv` — standardized attribute table

## Standard fields
UID, AGENSI, KATEGORI, HIERARKI, NAMA, UNIT, INDUK, ZON, DAERAH, PBT, ALAMAT, TELEFON, SRC_ID, X_CASS, Y_CASS, LATITUDE, LONGITUDE, GEOM_OK.

`DAERAH` and `PBT` are not guessed where those fields were absent in the source dataset. They can be enriched later using authoritative district/PBT boundary spatial joins.

## Dashboard preview
Open `index.html` in a browser. The dataset is embedded in `data.js`, so no local web server is required. Internet access is needed for the OpenStreetMap basemap, Leaflet, Google Fonts and Chart.js CDN.
