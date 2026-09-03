# Dashboard Kemudahan Keselamatan Negeri Selangor V1.8

## Default Basemap
Dashboard kini dibuka menggunakan **OpenStreetMap Standard** sebagai basemap lalai. Semua pilihan basemap lain dalam Compact Basemap Gallery masih dikekalkan dan boleh dipilih oleh pengguna.

Versi V1.8 mengekalkan Compact Basemap Gallery V1.4 dan menetapkan **susunan dropdown Agensi, Kategori dan Hierarki** mengikut struktur rasmi dashboard. Nilai paparan menggunakan format nama yang kemas, manakala nilai filter kekal sepadan dengan atribut asal dataset.

## Kandungan utama
- 184 kemudahan keselamatan: PDRM 137, JBPM 37, APM 10.
- Sempadan Daerah Negeri Selangor.
- Sempadan Pihak Berkuasa Tempatan Negeri Selangor.
- 18 basemap tanpa project API key.
- Butang basemap kompak di bawah kiri peta dengan thumbnail basemap aktif.
- Galeri 3-kolum desktop / 2-kolum skrin kecil dengan kategori dan tanda basemap aktif.
- Panel Lapisan Peta di kanan atas hanya untuk sempadan Daerah/PBT.
- Klik di luar galeri atau tekan Esc untuk menutup galeri.
- Filter Agensi, Kategori, Hierarki dan carian.
- KPI, peta, popup, carta dan jadual.

## Basemap
OpenStreetMap Standard, OpenStreetMap Humanitarian, CyclOSM, OpenTopoMap, CARTO Positron, CARTO Positron No Labels, CARTO Voyager, CARTO Voyager No Labels, CARTO Dark Matter, CARTO Dark Matter No Labels, Esri World Street Map, Esri World Topographic Map, Esri World Imagery, Esri World Terrain, Esri World Physical Map, Esri Light Gray Canvas, Esri Dark Gray Canvas dan Esri World Ocean.

## GitHub Pages
Upload semua fail dan folder dalam direktori ini ke root repository GitHub Pages. `index.html` mesti berada di root repo.

> Nota: basemap dan library web memerlukan sambungan internet semasa dashboard digunakan.


## V1.8 — Keyless basemaps

Basemap default ialah **OpenStreetMap Standard**. Semua basemap CARTO dan pilihan lain yang memerlukan API key/token telah dibuang daripada galeri.

Pilihan basemap V1.8 (tanpa API key):

1. OpenStreetMap Standard (default)
2. OpenStreetMap Humanitarian
3. OpenStreetMap France
4. OpenStreetMap DE
5. CyclOSM
6. CyclOSM Lite
7. OpenTopoMap
8. ÖPNVKarte

Fail CSS/JS/data menggunakan query versi `?v=1.7` untuk mengurangkan masalah cache selepas deploy ke GitHub Pages.

Nota: Tile server komuniti mempunyai polisi penggunaan masing-masing. Untuk trafik awam berskala besar, pertimbangkan tile hosting sendiri atau penyedia yang mempunyai SLA.


## V1.8
- Menambah logo rasmi PDRM, JBPM dan APM pada kad KPI masing-masing.
- Penempatan logo menggunakan badge putih untuk keterbacaan pada tema gelap.
- Semua fungsi V1.7 termasuk basemap tanpa API key dikekalkan.
