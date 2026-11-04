/* SweetSpot common functions - public-browser direct OpenAPI version */
window.SweetSpot = (() => {
  const STORE_KEY = 'sweetspot-preferences-v2';
  const FAV_KEY = 'sweetspot-favorites-v1';
  const BASE = 'https://apis.data.go.kr/B553077/api/open/sdsc2/';
  const API = BASE + 'storeListInDong';
  const regionCache = new Map();
  const PAGE_SIZE = 1000;
  const CODES = {
    cafe:{middle:'I212',small:'I21201'},
    bakery:{middle:'I210',small:'I21001'}
  };
  const maxPages = () => Math.max(1,Math.min(10, Number(window.SWEETSPOT_MAX_PAGES)||3));
  const apiKey = () => String(window.SWEETSPOT_API_KEY||'').trim();
  const mode = () => apiKey() ? 'direct' : 'demo';
  function preferences() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; } }
  function savePreferences(v) { localStorage.setItem(STORE_KEY, JSON.stringify(v)); }
  function getFav() { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; } }
  const FAV_STORES_KEY='sweetspot-favorite-stores-v1';
  function favoriteData(){try{const data=JSON.parse(localStorage.getItem(FAV_STORES_KEY)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}}
  function getFavStores(){const data=favoriteData();return getFav().map(id=>data[id]).filter(Boolean);}
  function rememberFavorites(items){const ids=new Set(getFav()),data=favoriteData();let changed=false;for(const item of items)if(ids.has(item.bizesId)){data[item.bizesId]=item;changed=true;}if(changed)try{localStorage.setItem(FAV_STORES_KEY,JSON.stringify(data));}catch{}}
  function toggleFav(id,store){const ids=new Set(getFav());if(ids.has(id)){ids.delete(id);}else{const data=favoriteData();if(store){data[id]=store;localStorage.setItem(FAV_STORES_KEY,JSON.stringify(data));}ids.add(id);}localStorage.setItem(FAV_KEY,JSON.stringify([...ids]));}
  function prepItems(items,region) {
    const list=items.filter(x=>x && x.bizesId).map(x=>({...x,region,type:x.indsSclsCd==='I21001'?'bakery':'cafe'}));rememberFavorites(list);return list;
  }
  function validatePoint(point) {
    if(!point || !/^\d{8,10}$/.test(String(point.adongCd)) || !point.label)
      throw new Error('시·도, 시·군·구, 읍·면·동을 모두 선택해 주세요.');
  }
  async function requestJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),20000);
    try {
      const response = await fetch(url.toString(),{signal:controller.signal});
      if(!response.ok) throw new Error(`공공데이터 HTTP 오류: ${response.status}`);
      let json;
      try { json = await response.json(); }
      catch { throw new Error('API 응답을 읽을 수 없습니다. 인증키와 API 상태를 확인해 주세요.'); }
      const code=String(json.header?.resultCode);
      if(code==='03') return {header:json.header,body:{items:[],totalCount:0}};
      if(code!=='00') throw new Error(`공공데이터 API 오류: ${json.header?.resultMsg||code}`);
      return json;
    } catch(e) {
      if(e.name==='AbortError') throw new Error('API 응답이 지연되고 있습니다. 잠시 후 다시 조회해 주세요.');
      if(e instanceof TypeError) throw new Error('API에 연결하지 못했습니다. 인터넷 연결과 API 상태를 확인해 주세요.');
      throw e;
    } finally { clearTimeout(timer); }
  }
  function responseItems(json) {
    const raw=json.body?.items??[];
    return Array.isArray(raw)?raw:(Array.isArray(raw.item)?raw.item:(raw.item?[raw.item]:[]));
  }
  async function regions(level,parent='') {
    const config={sido:['mega','','ctprvnCd','ctprvnNm'],sigungu:['cty','ctprvnCd','signguCd','signguNm'],dong:['admi','signguCd','adongCd','adongNm']}[level];
    if(!config || (config[1]&&!/^\d{2,5}$/.test(String(parent)))) throw new Error('지역 선택이 올바르지 않습니다.');
    const cacheKey=level+':'+parent;
    if(regionCache.has(cacheKey)) return regionCache.get(cacheKey);
    const url=new URL(BASE+'baroApi');
    url.searchParams.set('ServiceKey',apiKey());
    url.searchParams.set('type','json');url.searchParams.set('resId','dong');url.searchParams.set('catId',config[0]);
    if(config[1])url.searchParams.set(config[1],parent);
    const rows=responseItems(await requestJson(url));
    const list=[...new Map(rows.filter(x=>x[config[2]]&&x[config[3]]).map(x=>[String(x[config[2]]),{code:String(x[config[2]]),name:x[config[3]]}])).values()].sort((a,b)=>a.name.localeCompare(b.name,'ko'));
    regionCache.set(cacheKey,list);return list;
  }
  async function fetchPage(point,code,pageNo) {
    const url = new URL(API);
    const qs=url.searchParams;
    qs.set('ServiceKey',apiKey());
    qs.set('pageNo',String(pageNo));
    qs.set('numOfRows',String(PAGE_SIZE));
    qs.set('divId','adongCd');
    qs.set('key',String(point.adongCd));
    qs.set('indsLclsCd','I2');
    qs.set('indsMclsCd',code.middle);
    qs.set('indsSclsCd',code.small);
    qs.set('type','json');
    const json=await requestJson(url);
    const items=responseItems(json);
    return {items,total:Number(json.body?.totalCount||0),month:json.header?.stdrYm||''};
  }
  async function fetchCategory(point,name) {
    const first=await fetchPage(point,CODES[name],1);
    const pages=Math.min(maxPages(), Math.ceil(first.total/PAGE_SIZE));
    const further=await Promise.all(Array.from({length:Math.max(0,pages-1)},(_,i)=>fetchPage(point,CODES[name],i+2)));
    const all=[...first.items,...further.flatMap(x=>x.items)];
    const unique=[...new Map(all.map(x=>[x.bizesId||`${x.bizesNm}:${x.rdnmAdr}`,x])).values()];
    return {items:unique,total:first.total,limited:unique.length<first.total,month:first.month};
  }
  async function load(point) {
    if (mode()==='demo') {
      const res=await fetch('data/sample-stores.json');
      if(!res.ok) throw new Error('샘플 JSON을 읽을 수 없습니다. Live Server로 열어주세요.');
      const json=await res.json();
      const center=json.sampleCenter;
      return {mode:'demo',center,items:prepItems(json.items,center),totals:json.totals,sampleMonth:json.header.stdrYm,limited:true};
    }
    validatePoint(point);
    const [cafe,bakery]=await Promise.all([
      fetchCategory(point,'cafe'),fetchCategory(point,'bakery')
    ]);
    const raw=[...cafe.items,...bakery.items];
    return {
      mode:'direct',
      center:{...point},
      items:prepItems(raw,point),
      totals:{cafe:cafe.total,bakery:bakery.total},
      limited:cafe.limited||bakery.limited,
      sampleMonth:cafe.month||bakery.month
    };
  }
  function setBadge() {
    const el=document.getElementById('mode-badge');
    if(el) el.textContent=mode()==='demo'?'샘플 데이터':'OpenAPI 직접 호출';
  }
  return {mode,preferences,savePreferences,getFav,getFavStores,toggleFav,load,setBadge,regions};
})();
