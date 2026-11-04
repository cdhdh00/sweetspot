document.addEventListener('DOMContentLoaded',async()=>{
  const SS=window.SweetSpot,G=window.SweetSpotGeo,p=SS.preferences();
  const region=p.region||{sidoCd:'11',sigunguCd:'11200',adongCd:'11200650',label:'서울특별시 성동구 성수1가1동'};
  const el=id=>document.getElementById(id),text=(tag,value,cls)=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
  let points=[],visible=[],anchor=null,map=null,markers=null,ring=null,limit=20;
  let requested=new URLSearchParams(location.search).get('store');
  function favButton(store){
    const button=text('button','','small-button');button.type='button';
    const update=()=>{const saved=SS.getFav().includes(store.bizesId);button.textContent=saved?'♥ 즐겨찾기 저장됨':'♡ 즐겨찾기';button.setAttribute('aria-pressed',String(saved));button.classList.toggle('saved',saved);};
    update();button.dataset.favorite=store.bizesId;button.addEventListener('refresh-favorite',update);
    button.addEventListener('click',()=>{try{SS.toggleFav(store.bizesId,store);document.querySelectorAll('[data-favorite]').forEach(n=>n.dispatchEvent(new Event('refresh-favorite')));}catch{el('nearby-summary').textContent='즐겨찾기를 저장하지 못했습니다. 브라우저 저장소를 확인해 주세요.';}});return button;
  }
  function initMap(){
    if(!window.L){el('store-map').textContent='지도를 불러오지 못했습니다. 아래 매장 선택과 주변 목록은 계속 사용할 수 있습니다.';return;}
    map=L.map('store-map',{scrollWheelZoom:false,zoomSnap:0}).setView([37.55,126.98],12);
    if(window.maplibregl&&L.maplibreGL){
      L.maplibreGL({style:'data/map-style.json?v=color1-20261029',interactive:false,attributionControl:false}).addTo(map);
      map.attributionControl.addAttribution('<a href="https://openfreemap.org/">OpenFreeMap</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors');
    }else{el('map-message').textContent='배경 지도를 표시할 수 없습니다. 매장 위치와 주변 목록은 계속 사용할 수 있습니다.';}
    markers=L.layerGroup().addTo(map);
    const mapResize=new ResizeObserver(()=>{requestAnimationFrame(()=>{map.invalidateSize({pan:false});if(anchor)fitMap();});});mapResize.observe(el('store-map'));
  }
  function fitMap(){if(!map||!anchor||!ring)return;map.stop();map.fitBounds(ring.getBounds(),{padding:[40,40],maxZoom:19,animate:false});map.setView([Number(anchor.lat),Number(anchor.lon)],map.getZoom(),{animate:false});}
  function drawMap(neighbors=[]){
    if(!map)return;markers.clearLayers();if(ring){map.removeLayer(ring);ring=null;}const nearIds=new Set(neighbors.map(x=>x.bizesId));
    const ordered=[...visible.filter(x=>x.bizesId!==anchor?.bizesId),...visible.filter(x=>x.bizesId===anchor?.bizesId)];
    for(const store of ordered){const selected=store.bizesId===anchor?.bizesId,near=nearIds.has(store.bizesId);
      const marker=L.circleMarker([Number(store.lat),Number(store.lon)],{radius:selected?10:near?6:4,color:selected?'#8c551b':near?'#28684a':'#577568',fillColor:selected?'#f0ae55':near?'#38885e':'#90a99b',fillOpacity:selected?1:near?.9:.6,weight:selected?3:1}).addTo(markers);
      marker.bindTooltip(text('span',store.bizesNm||'이름 없음'));marker.on('click',()=>choose(store.bizesId,true));
      const node=marker.getElement();
      if(node){node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',`매장 위치: ${store.bizesNm} · ${store.rdnmAdr||store.lnoAdr||''}`);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(store.bizesId,true);}});}
    }
    if(anchor)ring=L.circle([Number(anchor.lat),Number(anchor.lon)],{radius:Number(el('near-radius').value),color:'#b78035',weight:2,fillOpacity:.055,interactive:false}).addTo(map);
  }
  function renderNearby(){
    el('selected-store').replaceChildren();el('nearby-list').replaceChildren();el('more-nearby').hidden=true;
    if(!anchor){el('nearby-summary').textContent='표시할 매장이 없습니다. 다른 지역을 선택해 보세요.';el('map-selected').textContent='현재 조회 지역에 표시할 매장이 없습니다.';drawMap();return;}
    const details=el('selected-store');details.append(text('h3',anchor.bizesNm||'이름 없음'),text('p',anchor.rdnmAdr||anchor.lnoAdr||'주소 정보 없음','muted'));
    const actions=text('div','','card-actions');actions.append(favButton(anchor));details.append(actions);
    const radius=Number(el('near-radius').value),neighbors=G.nearby(visible,anchor,radius);
    el('map-selected').replaceChildren(text('strong',`선택: ${anchor.bizesNm}`),text('span',` · 주변 ${radius.toLocaleString()}m 다른 매장 ${neighbors.length}곳 `));
    el('nearby-summary').textContent=`${anchor.bizesNm} 주변 ${radius.toLocaleString()}m · 다른 매장 ${neighbors.length}곳`;
    if(!neighbors.length)el('nearby-list').append(text('p','현재 조회 범위에서 가까운 다른 매장이 없습니다. 반경을 늘려 보세요.','empty'));
    for(const store of neighbors.slice(0,limit)){
      const card=text('article','','nearby-card'),head=text('div','','nearby-heading');head.append(text('h3',store.bizesNm),text('span',`${Math.round(store.distance).toLocaleString()}m`,'distance-tag'));
      card.append(head,text('p',`${store.rdnmAdr||store.lnoAdr||'주소 정보 없음'}`,'muted'));
      const actions=text('div','','card-actions'),pick=text('button','이 매장 주변 보기','small-button');pick.type='button';pick.addEventListener('click',()=>choose(store.bizesId,true));actions.append(pick,favButton(store));card.append(actions);el('nearby-list').append(card);
    }
    el('more-nearby').hidden=neighbors.length<=limit;el('more-nearby').textContent=`주변 매장 더 보기 (${Math.min(limit,neighbors.length)}/${neighbors.length})`;drawMap(neighbors);
  }
  function choose(id,pan=false){anchor=visible.find(x=>x.bizesId===id)||null;el('anchor-store').value=anchor?.bizesId||'';limit=20;renderNearby();window.SweetSpotInsights.render(visible,anchor);fitMap();}
  function renderStores(){
    visible=[...points].sort((a,b)=>String(a.bizesNm).localeCompare(String(b.bizesNm),'ko'));
    el('map-count').textContent=`${visible.length.toLocaleString()}곳 표시 · 지도의 점을 선택하세요`;
    const select=el('anchor-store');select.replaceChildren(new Option(visible.length?'매장을 선택하세요':'해당하는 매장 없음',''));
    [...visible].sort((a,b)=>String(a.bizesNm).localeCompare(String(b.bizesNm),'ko')).forEach(x=>select.add(new Option(x.bizesNm,x.bizesId)));select.disabled=!visible.length;
    const chosen=visible.find(x=>x.bizesId===requested)||visible.find(x=>x.bizesId===anchor?.bizesId)||visible[0];requested=null;choose(chosen?.bizesId);
  }
  el('anchor-store').addEventListener('change',()=>choose(el('anchor-store').value,true));
  el('near-radius').addEventListener('change',()=>{limit=20;renderNearby();fitMap();});el('more-nearby').addEventListener('click',()=>{limit+=20;renderNearby();});
  async function load(){
    el('retry-analysis').hidden=true;el('caveat').hidden=true;el('scope').textContent='매장 위치를 불러오는 중…';
    try{const data=await SS.load(region),all=data.items;points=all.filter(G.valid);
      el('scope').textContent=`${data.center.label} · 매장 ${all.length.toLocaleString()}곳 · ${/^\d{6}$/.test(String(data.sampleMonth))?String(data.sampleMonth).slice(0,4)+'.'+String(data.sampleMonth).slice(4)+' 기준':'기준월 정보 없음'}`;
      const notices=[];if(data.mode==='demo')notices.push('샘플 데이터입니다.');if(data.limited)notices.push('일부 매장만 불러왔습니다. 주변 매장 수는 조회된 매장 기준입니다.');if(all.length>points.length)notices.push(`${all.length-points.length}곳은 위치 정보가 없어 지도에서 제외했습니다.`);el('caveat').textContent=notices.join(' ');el('caveat').hidden=!notices.length;
      if(!map)initMap();renderStores();
    }catch(e){el('scope').textContent='매장 데이터를 불러오지 못했습니다.';el('caveat').textContent=e.message;el('caveat').hidden=false;el('retry-analysis').hidden=false;}
  }
  el('retry-analysis').addEventListener('click',load);await load();
});
