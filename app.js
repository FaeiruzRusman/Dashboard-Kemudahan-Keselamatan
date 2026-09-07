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
  style:{color:'#4b5563',weight:2.2,opacity:.88,dashArray:'13 5 2 5',lineCap:'round',lineJoin:'round',fillOpacity:0},
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
  style:{color:'#6b7280',weight:1.9,opacity:.82,dashArray:'13 5 2 4 2 5',lineCap:'round',lineJoin:'round',fillOpacity:0},
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
function renderAnalytics(fs,counts){const ctx=document.getElementById('agencyChart'); if(chart) chart.destroy();chart=new Chart(ctx,{type:'doughnut',data:{labels:['PDRM','JBPM','APM'],datasets:[{data:[counts.PDRM||0,counts.JBPM||0,counts.APM||0],backgroundColor:[agencyColors.PDRM,agencyColors.JBPM,agencyColors.APM],borderColor:'#fffdf9',borderWidth:3}]},options:{maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#5f6d80',boxWidth:10,font:{size:10}}}}}});const cc={};fs.forEach(f=>{const c=f.properties.KATEGORI||'Tidak Dinyatakan';cc[c]=(cc[c]||0)+1});document.getElementById('categoryList').innerHTML=Object.entries(cc).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([k,v])=>`<div class="cat-row"><span>${esc(k)}</span><strong>${v}</strong></div>`).join('');}
[agency,category,hierarchy].forEach(el=>el.addEventListener('change',render));search.addEventListener('input',render);document.getElementById('resetBtn').addEventListener('click',()=>{agency.value='';category.value='';hierarchy.value='';search.value='';map.setView([3.16,101.53],9);render();});render();



// V3.3 module navigation + functional indicative Coverage Analysis.
const moduleTabs=[...document.querySelectorAll('.module-tab')];
const overviewEls=[...document.querySelectorAll('.overview-only')];
const coverageEls=[...document.querySelectorAll('.coverage-only')];
let activeModule='overview';
let coverageLayer=L.layerGroup().addTo(map);
let coverageSelectedLayer=L.layerGroup().addTo(map);
let coverageChartInstance=null;
let lastCoverageRows=[];

const coverageAgency=document.getElementById('coverageAgency');
const coverageFacility=document.getElementById('coverageFacility');
const coverageSelectedName=document.getElementById('coverageSelectedName');
const coverageSelectedMeta=document.getElementById('coverageSelectedMeta');
const combineCoverage=document.getElementById('combineCoverage');

const coverageAgencyLabels={PDRM:'PDRM - Polis Diraja Malaysia',JBPM:'JBPM - Jabatan Bomba dan Penyelamat Malaysia',APM:'APM - Angkatan Pertahanan Awam Malaysia'};
agencyOptions.forEach(item=>{const o=document.createElement('option');o.value=item.value;o.textContent=coverageAgencyLabels[item.value]||item.label;coverageAgency.appendChild(o);});
coverageAgency.value='PDRM';

function getFeatureLabel(f){return f?.properties?.NAMA||'-';}
const coverageFacilityHierarchy=[
  'IPK','IPD','BALAI POLIS','BALAI POLIS MARIN','BALAI LAPANGAN TERBANG',
  'BALAI KOMUNITI','PONDOK POLIS','POS POLIS KOMUNITI','POS PENGAWAL',
  'BBP / Pejabat Zon','BBP','APM Negeri','APM Daerah'
];
const coverageCategoryLabels={
  'IPK':'IPK','IPD':'IPD','BALAI POLIS':'Balai Polis','BALAI POLIS MARIN':'Balai Polis Marin',
  'BALAI LAPANGAN TERBANG':'Balai Lapangan Terbang','BALAI KOMUNITI':'Balai Komuniti',
  'PONDOK POLIS':'Pondok Polis','POS POLIS KOMUNITI':'Pos Polis Komuniti','POS PENGAWAL':'Pos Pengawal',
  'BBP / Pejabat Zon':'BBP / Pejabat Zon','BBP':'BBP','APM Negeri':'APM Negeri','APM Daerah':'APM Daerah'
};
function coverageCategoryRank(category){
  const i=coverageFacilityHierarchy.indexOf(category);
  return i===-1?999:i;
}
function agencyFacilities(){
  return features.filter(f=>f.properties.AGENSI===coverageAgency.value).sort((a,b)=>{
    const ar=coverageCategoryRank(a.properties.KATEGORI),br=coverageCategoryRank(b.properties.KATEGORI);
    if(ar!==br) return ar-br;
    return getFeatureLabel(a).localeCompare(getFeatureLabel(b),'ms',{sensitivity:'base'});
  });
}
function fillCoverageFacilities(){
  const list=agencyFacilities();
  const prev=coverageFacility.value;
  coverageFacility.innerHTML='';
  const groups=new Map();
  list.forEach(f=>{
    const category=f.properties.KATEGORI||'Lain-lain';
    if(!groups.has(category)) groups.set(category,[]);
    groups.get(category).push(f);
  });
  [...groups.entries()].sort((a,b)=>coverageCategoryRank(a[0])-coverageCategoryRank(b[0])).forEach(([category,items])=>{
    const group=document.createElement('optgroup');
    group.label=coverageCategoryLabels[category]||category;
    items.forEach(f=>{
      const o=document.createElement('option');
      o.value=f.properties.UID||f.properties.SRC_ID||getFeatureLabel(f);
      o.textContent=getFeatureLabel(f);
      group.appendChild(o);
    });
    coverageFacility.appendChild(group);
  });
  if(list.some(f=>(f.properties.UID||f.properties.SRC_ID||getFeatureLabel(f))===prev)) coverageFacility.value=prev;
  updateCoverageSelectionCard();
}
function selectedCoverageFeature(){const key=coverageFacility.value;return agencyFacilities().find(f=>(f.properties.UID||f.properties.SRC_ID||getFeatureLabel(f))===key)||agencyFacilities()[0];}
function updateCoverageSelectionCard(){const f=selectedCoverageFeature();if(!f){coverageSelectedName.textContent='Tiada kemudahan';coverageSelectedMeta.textContent='-';return;}const p=f.properties;coverageSelectedName.textContent=p.NAMA;coverageSelectedMeta.textContent=[p.KATEGORI,p.ALAMAT].filter(Boolean).join(' · ')||p.KATEGORI||'-';}
coverageAgency.addEventListener('change',()=>{fillCoverageFacilities();clearCoverage(false);});
coverageFacility.addEventListener('change',()=>{updateCoverageSelectionCard();clearCoverage(false);});
fillCoverageFacilities();

// Proxy distances for an indicative driving catchment in a static, API-key-free deployment.
// These are not emergency response standards. Replace with Valhalla isochrones later.
const coverageKm={5:2.5,10:5.0,15:7.5};
const coverageStyles={5:{color:'#2ca94f',fillColor:'#54bf69',fillOpacity:.28,weight:1.5},10:{color:'#dfa31c',fillColor:'#f2bd3d',fillOpacity:.24,weight:1.5},15:{color:'#dd5b43',fillColor:'#ef7157',fillOpacity:.20,weight:1.7}};
function checkedTimes(){return [5,10,15].filter(t=>document.getElementById(`cov${t}`).checked);}
function makeBuffer(f,time){return turf.buffer(f,coverageKm[time],{units:'kilometers',steps:16});}
function unionFeatures(fs){
  if(!fs.length)return null;if(fs.length===1)return fs[0];
  try{return turf.union(turf.featureCollection(fs));}catch(e){console.warn('Coverage union fallback',e);return null;}
}
function targetFeatures(){return combineCoverage.checked?agencyFacilities():[selectedCoverageFeature()].filter(Boolean);}
function boundaryHits(boundaryFc,polygons,type){
  return boundaryFc.features.filter(b=>polygons.some(p=>{try{return turf.booleanIntersects(b,p);}catch(e){return false;}})).map(b=>({type,name:b.properties.web_name||b.properties.NAMA_DAERAH||b.properties.NAMA_PBT||'-',category:b.properties.web_type||b.properties.KATEGORI||'-'}));
}
function renderCoverageChart(areaByTime){
  const ctx=document.getElementById('coverageChart');if(coverageChartInstance)coverageChartInstance.destroy();
  const times=[5,10,15];
  coverageChartInstance=new Chart(ctx,{type:'bar',data:{labels:times.map(t=>`${t} min`),datasets:[{data:times.map(t=>areaByTime[t]||0),backgroundColor:['#54bf69','#f2bd3d','#ef7157'],borderRadius:5}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#68788b',font:{size:9}}},y:{beginAtZero:true,grid:{color:'rgba(220,207,193,.45)'},ticks:{color:'#68788b',font:{size:8}},title:{display:true,text:'km²',color:'#7d8999',font:{size:8}}}}}});
}
function renderCoverageRows(rows){
  lastCoverageRows=rows;
  const tb=document.getElementById('coverageTbody');
  tb.innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(r.type)}</td><td>${esc(r.name)}</td><td>${esc(r.category||'-')}</td><td><span class="coverage-status">Terlibat</span></td></tr>`).join(''):'<tr><td colspan="4">Tiada kawasan pentadbiran dikenal pasti.</td></tr>';
  document.getElementById('coverageTableMeta').textContent=`${rows.length} kawasan terlibat`;
  const list=document.getElementById('coverageAreaList');
  list.innerHTML=rows.slice(0,8).map(r=>`<div class="coverage-area-chip"><span>${esc(r.type)}</span><b>${esc(r.name)}</b></div>`).join('')+(rows.length>8?`<div class="coverage-area-chip"><span>Lain-lain</span><b>+${rows.length-8}</b></div>`:'');
}
function runCoverageAnalysis(){
  if(typeof turf==='undefined'){alert('Library analisis spatial belum dimuatkan. Refresh halaman dan cuba semula.');return;}
  const times=checkedTimes();if(!times.length){alert('Pilih sekurang-kurangnya satu masa liputan.');return;}
  const targets=targetFeatures();if(!targets.length)return;
  coverageLayer.clearLayers();coverageSelectedLayer.clearLayers();
  const polygonsByTime={};const areaByTime={};
  [...times].sort((a,b)=>b-a).forEach(time=>{
    const polys=targets.map(f=>makeBuffer(f,time));polygonsByTime[time]=polys;
    polys.forEach(poly=>L.geoJSON(poly,{style:coverageStyles[time],interactive:false}).addTo(coverageLayer));
    const merged=unionFeatures(polys);
    areaByTime[time]=(merged?turf.area(merged):polys.reduce((s,p)=>s+turf.area(p),0))/1e6;
  });
  targets.forEach(f=>{const [lng,lat]=f.geometry.coordinates;L.circleMarker([lat,lng],{radius:8,color:'#fff',weight:3,fillColor:'#1769d2',fillOpacity:1}).bindTooltip(getFeatureLabel(f),{direction:'top'}).addTo(coverageSelectedLayer);});
  const largest=Math.max(...times);const largestPolys=polygonsByTime[largest];
  const districts=boundaryHits(window.SEMPADAN_DAERAH,largestPolys,'Daerah');
  const pbts=boundaryHits(window.SEMPADAN_PBT,largestPolys,'PBT');
  const rows=[...districts,...pbts].sort((a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name,'ms'));
  document.getElementById('covArea').textContent=num(areaByTime[largest],1);
  document.getElementById('covDistricts').textContent=districts.length;
  document.getElementById('covPbts').textContent=pbts.length;
  document.getElementById('covSummaryFacility').textContent=combineCoverage.checked?`Semua ${coverageAgency.value}`:getFeatureLabel(selectedCoverageFeature());
  document.getElementById('covSummaryAgency').textContent=coverageAgencyLabels[coverageAgency.value]||coverageAgency.value;
  renderCoverageChart(areaByTime);renderCoverageRows(rows);
  const allBounds=[];largestPolys.forEach(poly=>{const bb=turf.bbox(poly);allBounds.push([bb[1],bb[0]],[bb[3],bb[2]]);});if(allBounds.length)map.fitBounds(allBounds,{padding:[25,25],maxZoom:12});
}
function clearCoverage(resetMap=true){
  coverageLayer.clearLayers();coverageSelectedLayer.clearLayers();
  document.getElementById('covArea').textContent='-';document.getElementById('covDistricts').textContent='-';document.getElementById('covPbts').textContent='-';document.getElementById('covSummaryFacility').textContent='Belum dijalankan';document.getElementById('covSummaryAgency').textContent='-';
  document.getElementById('coverageAreaList').innerHTML='<p>Jalankan analisis untuk melihat Daerah dan PBT terlibat.</p>';document.getElementById('coverageTbody').innerHTML='<tr><td colspan="4">Pilih parameter dan tekan Run Coverage.</td></tr>';document.getElementById('coverageTableMeta').textContent='Belum dianalisis';
  if(coverageChartInstance){coverageChartInstance.destroy();coverageChartInstance=null;}if(resetMap)map.setView([3.16,101.53],9);
}
document.getElementById('runCoverage').addEventListener('click',runCoverageAnalysis);document.getElementById('clearCoverage').addEventListener('click',()=>clearCoverage(true));

function setModule(module){
  activeModule=module;
  moduleTabs.forEach(t=>{const on=t.dataset.module===module;t.classList.toggle('active',on);t.setAttribute('aria-selected',String(on));});
  overviewEls.forEach(el=>el.hidden=module!=='overview');coverageEls.forEach(el=>el.hidden=module!=='coverage');
  if(module==='coverage'){
    clearCoverage(false);updateCoverageSelectionCard();
    const f=selectedCoverageFeature();if(f){const [lng,lat]=f.geometry.coordinates;map.setView([lat,lng],10);}
  } else {coverageLayer.clearLayers();coverageSelectedLayer.clearLayers();map.setView([3.16,101.53],9);render();}
  setTimeout(()=>map.invalidateSize(),60);
}
moduleTabs.forEach(tab=>tab.addEventListener('click',()=>setModule(tab.dataset.module)));
