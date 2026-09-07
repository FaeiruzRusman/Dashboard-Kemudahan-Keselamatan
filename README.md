# Dashboard Kemudahan Keselamatan Negeri Selangor V3.2

## Coverage Analysis berfungsi
- Tab `Coverage Analysis` kini membuka workspace sebenar.
- Pilih Agensi dan Kemudahan.
- Pilih zon 5 / 10 / 15 minit dan tekan `Run Coverage`.
- Peta menjana zon liputan indikatif dan menandakan kemudahan dipilih.
- Sistem mengira keluasan coverage dan mengenal pasti Daerah serta PBT yang bersilang dengan zon liputan.
- Ringkasan kanan memaparkan luas, bilangan Daerah/PBT, carta keluasan mengikut masa dan senarai kawasan terlibat.
- Jadual bawah memaparkan semua Daerah/PBT yang terlibat.
- Pilihan `Gabung liputan semua kemudahan agensi` disediakan untuk analisis seluruh agensi.

## Nota metodologi penting
V3.2 ialah implementasi **tanpa API key** untuk GitHub Pages. Zon 5/10/15 minit menggunakan proksi jarak driving (2.5 / 5.0 / 7.5 km) dan bukan network service area / masa respons sebenar. Struktur kod disediakan supaya enjin ini boleh diganti dengan Valhalla / Network Engine SUO kemudian tanpa perlu redesign UI.

## GitHub Pages
Upload/replace semua fail ke root repository. `index.html` mesti berada di root. Cache version telah dinaikkan kepada `?v=3.2`.
