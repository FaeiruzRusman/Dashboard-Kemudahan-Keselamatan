# Dashboard Kemudahan Keselamatan Negeri Selangor V2.1

## Perubahan V2.1
- Kedudukan label Daerah dan PBT tidak lagi menggunakan centre/bounds bagi keseluruhan MultiPolygon.
- Untuk setiap Daerah/PBT, sistem memilih **polygon komponen yang paling besar**.
- Titik label dipra-kira pada **interior centre / pole of inaccessibility** polygon terbesar tersebut, supaya label berada di kawasan utama dan tidak tersangkut pada pulau/polygon kecil atau di tepi sempadan.
- Label kekal sync dengan checkbox layer: tutup layer = sempadan dan label hilang bersama.
- Style sempadan V2.0 dikekalkan: Daerah hitam single-dot; PBT merah muda double-dot.
- Semua fungsi KPI/filter/map/chart/table/basemap daripada versi terdahulu dikekalkan.

## GitHub Pages
Upload/replace semua fail dalam folder ini ke root repository. `index.html` mesti berada di root. Query version `?v=2.1` digunakan untuk mengurangkan isu browser/GitHub Pages cache.
