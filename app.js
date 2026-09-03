const features = window.SAFETY_DATA.features;
const map = L.map('map',{zoomControl:true}).setView([3.16,101.53],9);

// V1.7: keyless basemap gallery. Default is always OpenStreetMap Standard.
// Only public raster tile services that do not require an API key are listed here.
const basemapDefs = {
  'osm-standard': {
    label:'OpenStreetMap Standard', group:'Street',
    url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options:{maxZoom:19, attribution:'&copy; OpenStreetMap contributors'}
  },
  'osm-humanitarian': {
    label:'OpenStreetMap Humanitarian', group:'Street',
    url:'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    options:{subdomains:'abc',maxZoom:19, attribution:'&copy; OpenStreetMap contributors, Tiles style by HOT'}
  },
  'osm-france': {
    label:'OpenStreetMap France', group:'Street',
    url:'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    options:{subdomains:'abc',maxZoom:20, attribution:'&copy; OpenStreetMap contributors, OSM France'}
  },
  'osm-de': {
    label:'OpenStreetMap DE', group:'Street',
    url:'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
    options:{maxZoom:19, attribution:'&copy; OpenStreetMap contributors'}
  },
  'cyclosm': {
    label:'CyclOSM', group:'Cycling',
    url:'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    options:{subdomains:'abc',maxZoom:20, attribution:'&copy; OpenStreetMap contributors, CyclOSM'}
  },
  'cyclosm-lite': {
    label:'CyclOSM Lite', group:'Cycling',
    url:'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm-lite/{z}/{x}/{y}.png',
    options:{subdomains:'abc',maxZoom:20, attribution:'&copy; OpenStreetMap contributors, CyclOSM'}
  },
  'opentopo': {
    label:'OpenTopoMap', group:'Topographic',
    url:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    options:{subdomains:'abc',maxZoom:17, attribution:'Map data &copy; OpenStreetMap contributors, SRTM | Map style &copy; OpenTopoMap'}
  },
  'opnvkarte': {
    label:'ÖPNVKarte', group:'Transport',
    url:'https://tile.memomaps.de/tilegen/{z}/{x}/{y}.png',
    options:{maxZoom:18, attribution:'Map data &copy; OpenStreetMap contributors | ÖPNVKarte'}
  }
};

const basemapLayers = Object.fromEntries(
  Object.entries(basemapDefs).map(([id,def])=>[id,L.tileLayer(def.url,def.options)])
);
const DEFAULT_BASEMAP_ID='osm-standard';
let activeBasemapId=DEFAULT_BASEMAP_ID;
let activeBasemap=basemapLayers[DEFAULT_BASEMAP_ID].addTo(map);

// Keep administrative boundaries below the safety facility markers, while labels
// remain clearly readable above the map symbols.
map.createPane('pbtBoundaryPane');
map.getPane('pbtBoundaryPane').style.zIndex = 350;
map.createPane('districtBoundaryPane');
map.getPane('districtBoundaryPane').style.zIndex = 360;
map.createPane('boundaryLabelPane');
map.getPane('boundaryLabelPane').style.zIndex = 625;
map.getPane('boundaryLabelPane').style.pointerEvents = 'none';

const agencyColors={PDRM:'#4da3ff',JBPM:'#ff6c67',APM:'#ffc857'};
let layer=L.layerGroup().addTo(map); let chart;

function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function num(v,d=2){const n=Number(v);return Number.isFinite(n)?n.toLocaleString('ms-MY',{maximumFractionDigits:d}):'-';}

// Administrative boundary layers supplied for this dashboard.
// V2.1 label placement convention:
//   1) For a multipart Daerah/PBT, choose the polygon component with the largest area.
//   2) Use a precomputed interior label point (pole of inaccessibility) inside that
//      largest polygon, instead of Leaflet's bounds-centre / multipart centroid.
//   3) Boundary and its labels remain synchronized with the same layer checkbox.
// Cartographic line convention remains:
//   Daerah = bold black line + single dot (dash-dot)
//   PBT    = light red line + double dot (dash-dot-dot)
function addBoundaryLabel(feature,labelLayer,className){
  const p=feature.properties||{};
  const name=p.web_name||p.NAMA_DAERAH||p.DAERAH||p.NAMA_PBT||'-';
  const lat=Number(p.web_label_lat);
  const lon=Number(p.web_label_lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)) return;
  L.tooltip({
    permanent:true,
    direction:'center',
    className:`boundary-label ${className}`,
    pane:'boundaryLabelPane',
    opacity:1,
    interactive:false
  }).setLatLng([lat,lon]).setContent(esc(name)).addTo(labelLayer);
}

const districtLabelLayer=L.layerGroup();
const districtBoundaryGeometry = L.geoJSON(window.SEMPADAN_DAERAH, {
  pane:'districtBoundaryPane',
  style:{color:'#111111',weight:2.8,opacity:1,dashArray:'13 5 2 5',lineCap:'round',lineJoin:'round',fillOpacity:0},
  onEachFeature:(feature, lyr)=>{
    const p=feature.properties||{};
    const name=p.web_name||p.NAMA_DAERAH||p.DAERAH||'-';
    addBoundaryLabel(feature,districtLabelLayer,'district-label');
    lyr.bindPopup(`<div class="pop-title">Sempadan Daerah Negeri Selangor</div><div><b>${esc(name)}</b></div><div class="pop-muted">Kod Daerah: ${esc(p.web_code||'-')}<br>Luas: ${num(p.web_area)} hektar</div>`);
  }
});
const districtBoundaryLayer=L.layerGroup([districtBoundaryGeometry,districtLabelLayer]).addTo(map);

const pbtLabelLayer=L.layerGroup();
const pbtBoundaryGeometry = L.geoJSON(window.SEMPADAN_PBT, {
  pane:'pbtBoundaryPane',
  style:{color:'#ff7d8a',weight:2.1,opacity:.98,dashArray:'13 5 2 4 2 5',lineCap:'round',lineJoin:'round',fillOpacity:0},
  onEachFeature:(feature, lyr)=>{
    const p=feature.properties||{};
    const name=p.web_name||p.NAMA_PBT||'-';
    addBoundaryLabel(feature,pbtLabelLayer,'pbt-label');
    lyr.bindPopup(`<div class="pop-title">Sempadan Pihak Berkuasa Tempatan Negeri Selangor</div><div><b>${esc(name)}</b></div><div class="pop-muted">Kategori: ${esc(p.web_type||p.KATEGORI||'-')}<br>Luas: ${num(p.web_area||p.Shape_area)} hektar</div>`);
  }
});
const pbtBoundaryLayer=L.layerGroup([pbtBoundaryGeometry,pbtLabelLayer]).addTo(map);

const basemapCount=document.getElementById('basemapCount');
const basemapGalleryBtn=document.getElementById('basemapGalleryBtn');
const basemapGallery=document.getElementById('basemapGallery');
const closeBasemapGallery=document.getElementById('closeBasemapGallery');
const basemapGrid=document.getElementById('basemapGrid');
const basemapFilters=document.getElementById('basemapFilters');
const activeBasemapName=document.getElementById('activeBasemapName');
const activeBasemapThumb=document.getElementById('activeBasemapThumb');
const basemapDock=document.querySelector('.basemap-dock');
let activeBasemapGroup='Semua';

// Generate representative preview tiles centred on Selangor (z9 / x400 / y251).
function tilePreviewUrl(def){
  return def.url
    .replace('{s}','a')
    .replace('{z}','9')
    .replace('{x}','400')
    .replace('{y}','251')
    .replace('{r}','');
}
function setThumb(el,def){
  const url=tilePreviewUrl(def);
  el.style.backgroundImage=`linear-gradient(rgba(7,17,31,.04),rgba(7,17,31,.04)),url("${url}")`;
}
function setBasemap(id){
  if(!basemapLayers[id] || id===activeBasemapId){
    closeGallery();
    return;
  }
  map.removeLayer(activeBasemap);
  activeBasemapId=id;
  activeBasemap=basemapLayers[id].addTo(map);
  activeBasemap.bringToBack();
  updateBasemapUI();
  closeGallery();
}
function updateBasemapUI(){
  const def=basemapDefs[activeBasemapId];
  activeBasemapName.textContent=def.label;
  basemapGalleryBtn.setAttribute('aria-label',`Basemap aktif: ${def.label}. Klik untuk pilih basemap lain.`);
  basemapGalleryBtn.title=`Basemap: ${def.label}`;
  setThumb(activeBasemapThumb,def);
  basemapGrid.querySelectorAll('.basemap-card').forEach(card=>{
    const isActive=card.dataset.basemap===activeBasemapId;
    card.classList.toggle('active',isActive);
    card.setAttribute('aria-pressed',String(isActive));
  });
}
function renderBasemapCards(){
  basemapGrid.innerHTML='';
  Object.entries(basemapDefs)
    .filter(([,def])=>activeBasemapGroup==='Semua'||def.group===activeBasemapGroup)
    .forEach(([id,def])=>{
      const card=document.createElement('button');
      card.type='button';
      card.className='basemap-card';
      card.dataset.basemap=id;
      card.setAttribute('role','listitem');
      card.setAttribute('aria-label',`Pilih ${def.label}`);
      card.setAttribute('aria-pressed',String(id===activeBasemapId));
      const thumb=document.createElement('span');
      thumb.className='basemap-thumb';
      setThumb(thumb,def);
      const label=document.createElement('span');
      label.className='basemap-label';
      label.innerHTML=`<span>${esc(def.label)}</span><span class="basemap-check" aria-hidden="true">✓</span>`;
      const group=document.createElement('small');
      group.className='basemap-group';
      group.textContent=def.group;
      card.append(thumb,label,group);
      card.addEventListener('click',()=>setBasemap(id));
      basemapGrid.appendChild(card);
    });
  updateBasemapUI();
}
function renderBasemapFilters(){
  const groups=['Semua',...new Set(Object.values(basemapDefs).map(d=>d.group))];
  basemapFilters.innerHTML='';
  groups.forEach(group=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='basemap-chip'+(group===activeBasemapGroup?' active':'');
    btn.textContent=group;
    btn.setAttribute('aria-pressed',String(group===activeBasemapGroup));
    btn.addEventListener('click',()=>{
      activeBasemapGroup=group;
      basemapFilters.querySelectorAll('.basemap-chip').forEach(b=>{
        const on=b.textContent===group;
        b.classList.toggle('active',on);
        b.setAttribute('aria-pressed',String(on));
      });
      renderBasemapCards();
    });
    basemapFilters.appendChild(btn);
  });
}
function openGallery(){
  basemapGallery.hidden=false;
  basemapGalleryBtn.setAttribute('aria-expanded','true');
}
function closeGallery(){
  basemapGallery.hidden=true;
  basemapGalleryBtn.setAttribute('aria-expanded','false');
}
basemapGalleryBtn.addEventListener('click',()=>basemapGallery.hidden?openGallery():closeGallery());
closeBasemapGallery.addEventListener('click',closeGallery);
document.addEventListener('click',e=>{if(!basemapGallery.hidden && basemapDock && !basemapDock.contains(e.target)) closeGallery();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!basemapGallery.hidden)closeGallery();});
basemapCount.textContent=`${Object.keys(basemapDefs).length} pilihan`;
renderBasemapFilters();
renderBasemapCards();
const toggleDistrict=document.getElementById('toggleDistrict');
const togglePbt=document.getElementById('togglePbt');
toggleDistrict.addEventListener('change',()=>toggleDistrict.checked?districtBoundaryLayer.addTo(map):map.removeLayer(districtBoundaryLayer));
togglePbt.addEventListener('change',()=>togglePbt.checked?pbtBoundaryLayer.addTo(map):map.removeLayer(pbtBoundaryLayer));

const agency=document.getElementById('agency'), category=document.getElementById('category'), hierarchy=document.getElementById('hierarchy'), search=document.getElementById('search');
const kpiFilters=[...document.querySelectorAll('.kpi-filter')];

function syncKpiActiveState(){
  kpiFilters.forEach(card=>{
    const cardAgency=card.dataset.agency||'';
    const active=agency.value===cardAgency;
    card.classList.toggle('active-filter',active);
    card.setAttribute('aria-pressed',String(active));
  });
}

function selectAgencyFromKpi(agencyValue){
  // KPI shortcut is intended to show the complete selected agency.
  agency.value=agencyValue;
  category.value='';
  hierarchy.value='';
  search.value='';
  render();
}

kpiFilters.forEach(card=>{
  card.addEventListener('click',()=>selectAgencyFromKpi(card.dataset.agency||''));
  card.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){
      e.preventDefault();
      selectAgencyFromKpi(card.dataset.agency||'');
    }
  });
});

// Susunan filter ditetapkan mengikut struktur rasmi Dashboard Kemudahan Keselamatan.
// `value` mesti sepadan tepat dengan nilai atribut dataset; `label` ialah teks paparan pengguna.
const agencyOptions=[
  {value:'PDRM',label:'PDRM'},
  {value:'JBPM',label:'JBPM'},
  {value:'APM',label:'APM'}
];
const categoryOptions=[
  {value:'IPK',label:'IPK'},
  {value:'BBP / Pejabat Zon',label:'BBP / Pejabat Zon'},
  {value:'APM Negeri',label:'APM Negeri'},
  {value:'IPD',label:'IPD'},
  {value:'BBP',label:'BBP'},
  {value:'APM Daerah',label:'APM Daerah'},
  {value:'BALAI POLIS',label:'Balai Polis'},
  {value:'BALAI POLIS MARIN',label:'Balai Polis Marin'},
  {value:'BALAI LAPANGAN TERBANG',label:'Balai Lapangan Terbang'},
  {value:'BALAI KOMUNITI',label:'Balai Komuniti'},
  {value:'PONDOK POLIS',label:'Pondok Polis'},
  {value:'POS POLIS KOMUNITI',label:'Pos Polis Komuniti'},
  {value:'POS PENGAWAL',label:'Pos Pengawal'}
];
const hierarchyOptions=[
  {value:'KONTINJEN',label:'Kontinjen'},
  {value:'BALAI/PEJABAT ZON',label:'Balai/Pejabat Zon'},
  {value:'NEGERI',label:'Negeri'},
  {value:'DAERAH',label:'Daerah'},
  {value:'BALAI',label:'Balai'},
  {value:'BALAI/UNIT',label:'Balai/Unit'}
];
function fillOrdered(sel,vals){vals.forEach(item=>{const o=document.createElement('option');o.value=item.value;o.textContent=item.label;sel.appendChild(o);});}
fillOrdered(agency,agencyOptions);
fillOrdered(category,categoryOptions);
fillOrdered(hierarchy,hierarchyOptions);
function filtered(){const q=search.value.trim().toLowerCase();return features.filter(f=>{const p=f.properties;return(!agency.value||p.AGENSI===agency.value)&&(!category.value||p.KATEGORI===category.value)&&(!hierarchy.value||p.HIERARKI===hierarchy.value)&&(!q||[p.NAMA,p.ALAMAT,p.INDUK,p.ZON].some(v=>String(v||'').toLowerCase().includes(q)));});}
function popup(p){return `<div class="pop-title">${esc(p.NAMA)}</div><div><b>${esc(p.AGENSI)}</b> · ${esc(p.KATEGORI||'-')}</div><div class="pop-muted">Hierarki: ${esc(p.HIERARKI||'-')}<br>Induk/Zon: ${esc(p.INDUK||p.ZON||'-')}<br>Alamat: ${esc(p.ALAMAT||'Tiada maklumat')}<br>Telefon: ${esc(p.TELEFON||'-')}<br>Koordinat: ${Number(p.LATITUDE).toFixed(6)}, ${Number(p.LONGITUDE).toFixed(6)}</div>`;}
function render(){const fs=filtered(); layer.clearLayers(); const bounds=[];fs.forEach(f=>{const [lng,lat]=f.geometry.coordinates;const p=f.properties;const m=L.circleMarker([lat,lng],{radius:6,weight:1,color:'#07111f',fillColor:agencyColors[p.AGENSI]||'#aaa',fillOpacity:.92});m.bindPopup(popup(p));m.addTo(layer);bounds.push([lat,lng]);});if(fs.length&&fs.length<features.length) map.fitBounds(bounds,{padding:[30,30],maxZoom:13});document.getElementById('visibleCount').textContent=fs.length;document.getElementById('tableMeta').textContent=`${fs.length} / ${features.length} rekod`;const counts={PDRM:0,JBPM:0,APM:0};fs.forEach(f=>counts[f.properties.AGENSI]=(counts[f.properties.AGENSI]||0)+1);document.getElementById('kTotal').textContent=fs.length;document.getElementById('kPdrm').textContent=counts.PDRM||0;document.getElementById('kJbpm').textContent=counts.JBPM||0;document.getElementById('kApm').textContent=counts.APM||0;syncKpiActiveState();renderTable(fs);renderAnalytics(fs,counts);}
function renderTable(fs){const tb=document.getElementById('tbody');tb.innerHTML=fs.slice(0,250).map(f=>{const p=f.properties;return `<tr><td>${esc(p.AGENSI)}</td><td>${esc(p.KATEGORI||'-')}</td><td>${esc(p.NAMA)}</td><td>${esc(p.HIERARKI||'-')}</td><td>${esc(p.INDUK||p.ZON||'-')}</td><td>${esc(p.ALAMAT||'-')}</td></tr>`}).join('');}
function renderAnalytics(fs,counts){const ctx=document.getElementById('agencyChart'); if(chart) chart.destroy();chart=new Chart(ctx,{type:'doughnut',data:{labels:['PDRM','JBPM','APM'],datasets:[{data:[counts.PDRM||0,counts.JBPM||0,counts.APM||0],backgroundColor:[agencyColors.PDRM,agencyColors.JBPM,agencyColors.APM],borderColor:'#10243a',borderWidth:3}]},options:{maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#b8cadb',boxWidth:10,font:{size:10}}}}}});const cc={};fs.forEach(f=>{const c=f.properties.KATEGORI||'Tidak Dinyatakan';cc[c]=(cc[c]||0)+1});document.getElementById('categoryList').innerHTML=Object.entries(cc).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([k,v])=>`<div class="cat-row"><span>${esc(k)}</span><strong>${v}</strong></div>`).join('');}
[agency,category,hierarchy].forEach(el=>el.addEventListener('change',render));search.addEventListener('input',render);document.getElementById('resetBtn').addEventListener('click',()=>{agency.value='';category.value='';hierarchy.value='';search.value='';map.setView([3.16,101.53],9);render();});render();
