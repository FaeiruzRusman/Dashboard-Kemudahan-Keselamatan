const features = window.SAFETY_DATA.features;
const map = L.map('map',{zoomControl:true}).setView([3.16,101.53],9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);

// Keep administrative boundaries below the safety facility markers.
map.createPane('pbtBoundaryPane');
map.getPane('pbtBoundaryPane').style.zIndex = 350;
map.createPane('districtBoundaryPane');
map.getPane('districtBoundaryPane').style.zIndex = 360;

const agencyColors={PDRM:'#4da3ff',JBPM:'#ff6c67',APM:'#ffc857'};
let layer=L.layerGroup().addTo(map); let chart;

function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function num(v,d=2){const n=Number(v);return Number.isFinite(n)?n.toLocaleString('ms-MY',{maximumFractionDigits:d}):'-';}

// Administrative boundary layers supplied for this dashboard.
const districtBoundaryLayer = L.geoJSON(window.SEMPADAN_DAERAH, {
  pane:'districtBoundaryPane',
  style:{color:'#38d6bd',weight:2.4,opacity:.95,fillOpacity:0},
  onEachFeature:(feature, lyr)=>{
    const p=feature.properties||{};
    lyr.bindPopup(`<div class="pop-title">Sempadan Daerah Negeri Selangor</div><div><b>${esc(p.web_name||'-')}</b></div><div class="pop-muted">Kod Daerah: ${esc(p.web_code||'-')}<br>Luas: ${num(p.web_area)} hektar</div>`);
  }
}).addTo(map);

const pbtBoundaryLayer = L.geoJSON(window.SEMPADAN_PBT, {
  pane:'pbtBoundaryPane',
  style:{color:'#ffc857',weight:1.5,opacity:.88,dashArray:'6 5',fillOpacity:0},
  onEachFeature:(feature, lyr)=>{
    const p=feature.properties||{};
    lyr.bindPopup(`<div class="pop-title">Sempadan Pihak Berkuasa Tempatan Negeri Selangor</div><div><b>${esc(p.web_name||p.NAMA_PBT||'-')}</b></div><div class="pop-muted">Kategori: ${esc(p.web_type||p.KATEGORI||'-')}<br>Luas: ${num(p.web_area||p.Shape_area)} hektar</div>`);
  }
}).addTo(map);

const toggleDistrict=document.getElementById('toggleDistrict');
const togglePbt=document.getElementById('togglePbt');
toggleDistrict.addEventListener('change',()=>toggleDistrict.checked?districtBoundaryLayer.addTo(map):map.removeLayer(districtBoundaryLayer));
togglePbt.addEventListener('change',()=>togglePbt.checked?pbtBoundaryLayer.addTo(map):map.removeLayer(pbtBoundaryLayer));

const agency=document.getElementById('agency'), category=document.getElementById('category'), hierarchy=document.getElementById('hierarchy'), search=document.getElementById('search');
function uniq(field){return [...new Set(features.map(f=>f.properties[field]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));}
function fill(sel,vals){vals.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o);});}
fill(agency,uniq('AGENSI')); fill(category,uniq('KATEGORI')); fill(hierarchy,uniq('HIERARKI'));
function filtered(){const q=search.value.trim().toLowerCase();return features.filter(f=>{const p=f.properties;return(!agency.value||p.AGENSI===agency.value)&&(!category.value||p.KATEGORI===category.value)&&(!hierarchy.value||p.HIERARKI===hierarchy.value)&&(!q||[p.NAMA,p.ALAMAT,p.INDUK,p.ZON].some(v=>String(v||'').toLowerCase().includes(q)));});}
function popup(p){return `<div class="pop-title">${esc(p.NAMA)}</div><div><b>${esc(p.AGENSI)}</b> · ${esc(p.KATEGORI||'-')}</div><div class="pop-muted">Hierarki: ${esc(p.HIERARKI||'-')}<br>Induk/Zon: ${esc(p.INDUK||p.ZON||'-')}<br>Alamat: ${esc(p.ALAMAT||'Tiada maklumat')}<br>Telefon: ${esc(p.TELEFON||'-')}<br>Koordinat: ${Number(p.LATITUDE).toFixed(6)}, ${Number(p.LONGITUDE).toFixed(6)}</div>`;}
function render(){const fs=filtered(); layer.clearLayers(); const bounds=[];fs.forEach(f=>{const [lng,lat]=f.geometry.coordinates;const p=f.properties;const m=L.circleMarker([lat,lng],{radius:6,weight:1,color:'#07111f',fillColor:agencyColors[p.AGENSI]||'#aaa',fillOpacity:.92});m.bindPopup(popup(p));m.addTo(layer);bounds.push([lat,lng]);});if(fs.length&&fs.length<features.length) map.fitBounds(bounds,{padding:[30,30],maxZoom:13});document.getElementById('visibleCount').textContent=fs.length;document.getElementById('tableMeta').textContent=`${fs.length} / ${features.length} rekod`;const counts={PDRM:0,JBPM:0,APM:0};fs.forEach(f=>counts[f.properties.AGENSI]=(counts[f.properties.AGENSI]||0)+1);document.getElementById('kTotal').textContent=fs.length;document.getElementById('kPdrm').textContent=counts.PDRM||0;document.getElementById('kJbpm').textContent=counts.JBPM||0;document.getElementById('kApm').textContent=counts.APM||0;renderTable(fs);renderAnalytics(fs,counts);}
function renderTable(fs){const tb=document.getElementById('tbody');tb.innerHTML=fs.slice(0,250).map(f=>{const p=f.properties;return `<tr><td>${esc(p.AGENSI)}</td><td>${esc(p.KATEGORI||'-')}</td><td>${esc(p.NAMA)}</td><td>${esc(p.HIERARKI||'-')}</td><td>${esc(p.INDUK||p.ZON||'-')}</td><td>${esc(p.ALAMAT||'-')}</td></tr>`}).join('');}
function renderAnalytics(fs,counts){const ctx=document.getElementById('agencyChart'); if(chart) chart.destroy();chart=new Chart(ctx,{type:'doughnut',data:{labels:['PDRM','JBPM','APM'],datasets:[{data:[counts.PDRM||0,counts.JBPM||0,counts.APM||0],backgroundColor:[agencyColors.PDRM,agencyColors.JBPM,agencyColors.APM],borderColor:'#10243a',borderWidth:3}]},options:{maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#b8cadb',boxWidth:10,font:{size:10}}}}}});const cc={};fs.forEach(f=>{const c=f.properties.KATEGORI||'Tidak Dinyatakan';cc[c]=(cc[c]||0)+1});document.getElementById('categoryList').innerHTML=Object.entries(cc).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([k,v])=>`<div class="cat-row"><span>${esc(k)}</span><strong>${v}</strong></div>`).join('');}
[agency,category,hierarchy].forEach(el=>el.addEventListener('change',render));search.addEventListener('input',render);document.getElementById('resetBtn').addEventListener('click',()=>{agency.value='';category.value='';hierarchy.value='';search.value='';map.setView([3.16,101.53],9);render();});render();
