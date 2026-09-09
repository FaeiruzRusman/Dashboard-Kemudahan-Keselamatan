// V3.6 — Facility Density Analysis
(() => {
  const nav=document.querySelector('.module-tabs');
  const mapWrap=document.querySelector('.map-wrap');
  const nearestSummary=document.getElementById('nearestSummary');
  const nearestTable=document.getElementById('nearestTable');
  if(!nav||!mapWrap||!window.SEMPADAN_DAERAH||!window.SEMPADAN_PBT) return;

  const tab=document.createElement('button');
  tab.className='module-tab density-tab';
  tab.type='button';
  tab.dataset.module='density';
  tab.setAttribute('aria-selected','false');
  tab.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9h4v10M10 19V5h4v14M16 19v-7h4v7M3 19h18"/></svg><span>Density Analysis</span>';
  nav.appendChild(tab);

  const controls=document.createElement('aside');
  controls.className='panel density-controls density-only';
  controls.hidden=true;
  controls.innerHTML=`
    <div class="density-title"><span class="density-title-icon">▦</span><div><strong>Facility Density Analysis</strong><small>Bandingkan kepadatan kemudahan keselamatan mengikut keluasan pentadbiran</small></div></div>
    <label>Unit Pentadbiran<select id="densityAdmin"><option value="district">Daerah</option><option value="pbt">PBT</option></select></label>
    <label>Agensi<select id="densityAgency"><option value="">Semua Agensi</option><option value="PDRM">PDRM</option><option value="JBPM">JBPM</option><option value="APM">APM</option></select></label>
    <button id="runDensity" class="density-run" type="button">▶ Run Density Analysis</button>
    <div class="density-note"><b>Kaedah:</b> jumlah kemudahan dalam setiap Daerah/PBT dibahagi keluasan kawasan dan dinormalisasi kepada <b>100 km²</b>. Analisis menggunakan koordinat fasiliti dan sempadan pentadbiran sedia ada.</div>`;
  mapWrap.parentNode.insertBefore(controls,mapWrap);

  const summary=document.createElement('aside');
  summary.className='panel density-summary density-only';
  summary.hidden=true;
  summary.innerHTML=`
    <div class="panel-title">Ringkasan Density</div>
    <div class="density-metrics">
      <div class="density-metric"><small>Purata Density</small><strong id="densityAvg">-</strong><span>kemudahan / 100 km²</span></div>
      <div class="density-metric"><small>Kawasan Dianalisis</small><strong id="densityAreaCount">-</strong><span id="densityAreaUnit">kawasan</span></div>
      <div class="density-metric"><small>Jumlah Kemudahan</small><strong id="densityFacilityCount">-</strong><span>dalam kawasan analisis</span></div>
      <div class="density-metric"><small>Kawasan Tanpa Kemudahan</small><strong id="densityZero">-</strong><span>kawasan</span></div>
    </div>
    <div class="density-highlight"><small>Density Tertinggi</small><strong id="densityTopName">Belum dianalisis</strong><span id="densityTopValue">-</span></div>
    <div class="density-chart-wrap"><h3>Ranking Density</h3><canvas id="densityChart"></canvas></div>`;
  nearestSummary.parentNode.insertBefore(summary,nearestSummary.nextSibling);

  const legend=document.createElement('div');
  legend.className='density-map-legend density-only';
  legend.hidden=true;
  legend.innerHTML='<strong>Density / 100 km²</strong><div class="density-scale"><i class="density-s1"></i><i class="density-s2"></i><i class="density-s3"></i><i class="density-s4"></i><i class="density-s5"></i><span>Rendah → Tinggi</span></div>';
  mapWrap.appendChild(legend);

  const table=document.createElement('section');
  table.className='panel density-table-panel density-only';
  table.hidden=true;
  table.innerHTML=`<div class="panel-title">Ranking Facility Density <span id="densityTableMeta">Belum dianalisis</span></div><div class="table-scroll"><table><thead><tr><th>Ranking</th><th>Kawasan</th><th>Jumlah</th><th>Luas (km²)</th><th>Density / 100 km²</th></tr></thead><tbody id="densityTbody"><tr><td colspan="5">Tekan Run Density Analysis.</td></tr></tbody></table></div>`;
  nearestTable.parentNode.insertBefore(table,nearestTable.nextSibling);

  let densityLayer=null,densityChart=null,lastResults=[];
  const colors=['#fff4e8','#fbd8bb','#f3ad76','#e67842','#b94d2e'];

  function ringContains(pt,ring){
    const [x,y]=pt; let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const [xi,yi]=ring[i], [xj,yj]=ring[j];
      const hit=((yi>y)!=(yj>y)) && (x < (xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi);
      if(hit) inside=!inside;
    }
    return inside;
  }
  function polygonContains(pt,poly){
    if(!poly?.length||!ringContains(pt,poly[0])) return false;
    for(let i=1;i<poly.length;i++) if(ringContains(pt,poly[i])) return false;
    return true;
  }
  function featureContains(pt,f){
    const g=f?.geometry; if(!g) return false;
    if(g.type==='Polygon') return polygonContains(pt,g.coordinates);
    if(g.type==='MultiPolygon') return g.coordinates.some(poly=>polygonContains(pt,poly));
    return false;
  }
  function featurePoint(f){
    if(f?.geometry?.type==='Point'&&Array.isArray(f.geometry.coordinates)) return f.geometry.coordinates;
    const p=f?.properties||{};
    const lon=Number(p.lon??p.lng??p.longitude??p.LONGITUDE??p.X??p.x);
    const lat=Number(p.lat??p.latitude??p.LATITUDE??p.Y??p.y);
    return Number.isFinite(lon)&&Number.isFinite(lat)?[lon,lat]:null;
  }
  function ringAreaKm2(ring){
    if(!ring||ring.length<3) return 0;
    const R=6371.0088, rad=Math.PI/180; let sum=0;
    for(let i=0;i<ring.length-1;i++){
      const [lon1,lat1]=ring[i], [lon2,lat2]=ring[i+1];
      sum+=(lon2-lon1)*rad*(2+Math.sin(lat1*rad)+Math.sin(lat2*rad));
    }
    return Math.abs(sum*R*R/2);
  }
  function geometryAreaKm2(g){
    if(!g) return 0;
    const polyArea=poly=>Math.max(0,ringAreaKm2(poly[0])-(poly.slice(1).reduce((s,r)=>s+ringAreaKm2(r),0)));
    if(g.type==='Polygon') return polyArea(g.coordinates);
    if(g.type==='MultiPolygon') return g.coordinates.reduce((s,p)=>s+polyArea(p),0);
    return 0;
  }
  function areaKm2(f){
    const p=f.properties||{}; const ha=Number(p.web_area);
    if(Number.isFinite(ha)&&ha>0) return ha/100;
    return geometryAreaKm2(f.geometry);
  }
  function areaName(f,type){
    const p=f.properties||{};
    return p.web_name||(type==='district'?(p.NAMA_DAERAH||p.DAERAH):(p.NAMA_PBT||p.PBT))||'-';
  }
  function calc(){
    const type=document.getElementById('densityAdmin').value;
    const agencyVal=document.getElementById('densityAgency').value;
    const fc=type==='district'?window.SEMPADAN_DAERAH:window.SEMPADAN_PBT;
    const facilities=features.filter(f=>!agencyVal||(f.properties||{}).AGENSI===agencyVal);
    return fc.features.map(a=>{
      const count=facilities.reduce((n,f)=>{const pt=featurePoint(f); return n+(pt&&featureContains(pt,a)?1:0);},0);
      const km2=areaKm2(a); const density=km2>0?count*100/km2:0;
      return {feature:a,name:areaName(a,type),count,km2,density,type};
    }).sort((a,b)=>b.density-a.density||b.count-a.count||a.name.localeCompare(b.name));
  }
  function densityColor(value,max){
    if(max<=0) return colors[0];
    const ratio=value/max;
    const idx=Math.min(4,Math.floor(ratio*5));
    return colors[idx];
  }
  function drawMap(results){
    if(densityLayer) map.removeLayer(densityLayer);
    const max=Math.max(...results.map(r=>r.density),0);
    const byName=new Map(results.map(r=>[r.name,r]));
    const type=document.getElementById('densityAdmin').value;
    const fc=type==='district'?window.SEMPADAN_DAERAH:window.SEMPADAN_PBT;
    densityLayer=L.geoJSON(fc,{style:f=>{const r=byName.get(areaName(f,type));return {color:'#9d6549',weight:1.2,opacity:.7,fillColor:densityColor(r?.density||0,max),fillOpacity:.72};},onEachFeature:(f,lyr)=>{
      const r=byName.get(areaName(f,type)); if(!r) return;
      lyr.bindTooltip(`<b>${esc(r.name)}</b><br>${r.count} kemudahan · ${r.density.toFixed(2)} / 100 km²`,{sticky:true,className:'density-tooltip'});
      lyr.bindPopup(`<div class="pop-title">${esc(r.name)}</div><div><b>${r.count}</b> kemudahan keselamatan</div><div class="pop-muted">Luas: ${r.km2.toFixed(1)} km²<br>Density: ${r.density.toFixed(2)} kemudahan / 100 km²</div>`);
    }}).addTo(map);
  }
  function drawChart(results){
    if(densityChart){densityChart.destroy();densityChart=null;}
    const canvas=document.getElementById('densityChart'); if(!window.Chart||!canvas) return;
    const top=results.slice(0,10);
    densityChart=new Chart(canvas,{type:'bar',data:{labels:top.map(r=>r.name),datasets:[{label:'Density / 100 km²',data:top.map(r=>Number(r.density.toFixed(2))),backgroundColor:'#e67842',borderRadius:5}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{font:{size:8}}},y:{ticks:{font:{size:8}}}}}});
  }
  function updateSummary(results){
    const totalCount=results.reduce((s,r)=>s+r.count,0);
    const avg=results.length?results.reduce((s,r)=>s+r.density,0)/results.length:0;
    const zero=results.filter(r=>r.count===0).length;
    const top=results[0];
    document.getElementById('densityAvg').textContent=avg.toFixed(2);
    document.getElementById('densityAreaCount').textContent=results.length;
    document.getElementById('densityFacilityCount').textContent=totalCount;
    document.getElementById('densityZero').textContent=zero;
    document.getElementById('densityAreaUnit').textContent=document.getElementById('densityAdmin').value==='district'?'daerah':'PBT';
    document.getElementById('densityTopName').textContent=top?.name||'-';
    document.getElementById('densityTopValue').textContent=top?`${top.density.toFixed(2)} kemudahan / 100 km² · ${top.count} kemudahan`:'-';
  }
  function updateTable(results){
    const tbody=document.getElementById('densityTbody');
    tbody.innerHTML=results.map((r,i)=>`<tr><td><span class="density-rank">${i+1}</span></td><td><b>${esc(r.name)}</b></td><td>${r.count}</td><td>${r.km2.toFixed(1)}</td><td class="density-value">${r.density.toFixed(2)}</td></tr>`).join('');
    const agencyVal=document.getElementById('densityAgency').value||'Semua Agensi';
    document.getElementById('densityTableMeta').textContent=`${results.length} kawasan · ${agencyVal}`;
  }
  function run(){
    lastResults=calc();
    drawMap(lastResults); updateSummary(lastResults); updateTable(lastResults); drawChart(lastResults);
  }
  function hideExisting(){
    document.querySelectorAll('.overview-only,.coverage-only,.nearest-only').forEach(el=>el.hidden=true);
    if(typeof clearCoverage==='function') try{clearCoverage(false);}catch(e){}
    if(typeof clearNearest==='function') try{clearNearest(false);}catch(e){}
    try{if(map.hasLayer(layer)) map.removeLayer(layer);}catch(e){}
    try{if(map.hasLayer(districtBoundaryLayer))map.removeLayer(districtBoundaryLayer);}catch(e){}
    try{if(map.hasLayer(pbtBoundaryLayer))map.removeLayer(pbtBoundaryLayer);}catch(e){}
  }
  function showDensity(){
    activeModule='density';
    document.querySelectorAll('.module-tab').forEach(t=>{const on=t===tab;t.classList.toggle('active',on);t.setAttribute('aria-selected',String(on));});
    hideExisting();
    document.querySelectorAll('.density-only').forEach(el=>el.hidden=false);
    map.getContainer().classList.remove('nearest-pick-mode');
    setTimeout(()=>map.invalidateSize(),50);
    run();
  }
  function leaveDensity(){
    document.querySelectorAll('.density-only').forEach(el=>el.hidden=true);
    if(densityLayer){map.removeLayer(densityLayer);densityLayer=null;}
    try{if(toggleDistrict.checked&&!map.hasLayer(districtBoundaryLayer))districtBoundaryLayer.addTo(map);}catch(e){}
    try{if(togglePbt.checked&&!map.hasLayer(pbtBoundaryLayer))pbtBoundaryLayer.addTo(map);}catch(e){}
    try{if(!map.hasLayer(layer))layer.addTo(map);}catch(e){}
  }

  tab.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();showDensity();});
  [...nav.querySelectorAll('.module-tab:not(.density-tab)')].forEach(t=>t.addEventListener('click',()=>{if(activeModule==='density')leaveDensity();},true));
  document.getElementById('runDensity').addEventListener('click',run);
  document.getElementById('densityAdmin').addEventListener('change',run);
  document.getElementById('densityAgency').addEventListener('change',run);

  const version=document.querySelector('.footer-version'); if(version) version.textContent='Versi 3.6';
})();
