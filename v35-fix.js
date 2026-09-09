// V3.5 — robust Nearest Facility map-pick patch.
// Loaded after app.js so the existing V3.4 module stays intact.
(() => {
  let lastLeafletPick = 0;
  const mapEl = map.getContainer();
  const tabs = [...document.querySelectorAll('.module-tab')];

  function syncNearestCursor(){
    const nearestOn = activeModule === 'nearest' || document.querySelector('.module-tab.nearest-tab')?.classList.contains('active');
    mapEl.classList.toggle('nearest-pick-mode', nearestOn);
  }

  // Existing Leaflet click handler remains the primary path.
  map.on('click', () => {
    if(activeModule === 'nearest') lastLeafletPick = Date.now();
  });

  // Keep the map interaction state in sync with module tabs.
  tabs.forEach(tab => tab.addEventListener('click', () => setTimeout(syncNearestCursor, 0)));
  syncNearestCursor();

  // Fallback: some Leaflet child layers can consume the normal map click.
  // Capture the physical click, then wait until normal Leaflet handling has had
  // a chance to run. Only run the fallback when no normal map click occurred.
  mapEl.addEventListener('click', ev => {
    if(activeModule !== 'nearest') return;
    if(ev.target.closest('.leaflet-control,.map-layers,.basemap-dock,.nearest-map-hint,.coverage-map-legend,.leaflet-popup')) return;

    const rect = mapEl.getBoundingClientRect();
    const point = L.point(ev.clientX - rect.left, ev.clientY - rect.top);
    const latlng = map.containerPointToLatLng(point);

    setTimeout(() => {
      if(activeModule !== 'nearest') return;
      if(Date.now() - lastLeafletPick < 180) return;
      runNearestAt(latlng);
    }, 0);
  }, true);
})();
