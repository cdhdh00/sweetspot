document.addEventListener('DOMContentLoaded', async () => {
  const SS=window.SweetSpot, form=document.getElementById('search-form');
  const sido=document.getElementById('sido'),sigungu=document.getElementById('sigungu'),dong=document.getElementById('dong');
  const keyword=document.getElementById('keyword'),favoritesOnly=document.getElementById('favorites-only');
  const results=document.getElementById('results'),summary=document.getElementById('result-summary');
  const err=document.getElementById('error');
  const submit=document.getElementById('search-submit'),retry=document.getElementById('region-retry');
  let payload=null,regionVersion=0,queryVersion=0,busy=false;
  const saved=SS.preferences();

  function text(tag,content,cls){const n=document.createElement(tag);n.textContent=content;if(cls)n.className=cls;return n;}
  function showError(msg){err.hidden=!msg;err.textContent=msg||'';}
  function render(){
    if(!payload&&!favoritesOnly.checked) return;
    const key=keyword.value.trim().toLocaleLowerCase('ko');
    const list=(favoritesOnly.checked?SS.getFavStores():payload.items).filter(x=>x.bizesNm.toLocaleLowerCase('ko').includes(key));
    list.sort((a,b)=>a.bizesNm.localeCompare(b.bizesNm,'ko'));
    results.replaceChildren();
    summary.textContent=favoritesOnly.checked?`즐겨찾기 · ${list.length}건`:`${payload.center.label} · 검색 결과: ${list.length}건`;
    const missing=SS.getFav().length-SS.getFavStores().length;if(favoritesOnly.checked&&missing>0)results.append(text('p',`이전에 저장한 ${missing}곳은 해당 동네를 다시 조회하면 목록에 표시됩니다.`,'muted'));
    if(!list.length){results.append(text('p',favoritesOnly.checked?(key?'검색어에 맞는 즐겨찾기가 없어요.':'저장한 매장이 없어요. 마음에 드는 매장의 ♡ 즐겨찾기를 눌러보세요.'):'조건에 맞는 매장이 없어요.','empty'));return;}
    for(const item of list){
      const card=text('article','', 'card'), top=text('div','','card-top'), info=text('div','');
      info.append(text('h3',item.bizesNm || '이름 없음'),text('div',item.rdnmAdr||item.lnoAdr||'주소 정보 없음','address'));
      top.append(info);
      const actions=text('div','','card-actions'), btn=text('button','','small-button'); btn.type='button';
      const update=()=>{ const isSaved=SS.getFav().includes(item.bizesId);btn.textContent=isSaved?'♥ 즐겨찾기 저장됨':'♡ 즐겨찾기';btn.classList.toggle('saved',isSaved);btn.setAttribute('aria-pressed',String(isSaved)); };
      btn.addEventListener('click',()=>{try{SS.toggleFav(item.bizesId,item);if(favoritesOnly.checked)render();else update();}catch{showError('즐겨찾기를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.');}});update();
      const nearby=document.createElement('a');nearby.className='small-button';nearby.href=`analysis.html?store=${encodeURIComponent(item.bizesId)}`;nearby.textContent='주변 선택지 보기';nearby.addEventListener('click',()=>{if(item.region)SS.savePreferences({region:item.region});});actions.append(nearby,btn);card.append(top,actions);results.append(card);
    }
  }
  function setOptions(el,rows,placeholder,desired) {
    el.replaceChildren(new Option(placeholder,''));
    rows.forEach(row=>el.add(new Option(row.name,row.code)));
    el.disabled=rows.length===0;
    if(rows.some(row=>row.code===desired))el.value=desired;
  }
  function selection() {
    if(!sido.value||!sigungu.value||!dong.value)throw new Error('지역을 끝까지 선택해 주세요.');
    return {sidoCd:sido.value,sigunguCd:sigungu.value,adongCd:dong.value,label:[sido,sigungu,dong].map(el=>el.selectedOptions[0].textContent).join(' ')};
  }
  function updateSubmit(){submit.disabled=busy||!sido.value||!sigungu.value||!dong.value;}
  function clearResults(){queryVersion++;payload=null;results.replaceChildren();summary.textContent='읍·면·동을 선택한 뒤 매장 조회를 눌러주세요.';showError('');if(favoritesOnly.checked)render();}
  async function updateRegions(level,parent,desired,version){
    const el=level==='sido'?sido:level==='sigungu'?sigungu:dong;
    setOptions(el,[],'불러오는 중…');updateSubmit();
    const rows=await SS.regions(level,parent);
    if(version!==regionVersion)return false;
    setOptions(el,rows,rows.length?'선택하세요':'API에 등록된 지역이 없습니다',desired);updateSubmit();return true;
  }
  async function refresh(point){
    const version=++queryVersion;busy=true;updateSubmit();showError('');
    summary.textContent='선택한 행정동 전체의 매장을 불러오는 중…';results.replaceChildren();payload=null;if(favoritesOnly.checked)render();
    try{const data=await SS.load(point);if(version!==queryVersion)return;payload=data;render();}
    catch(e){if(version===queryVersion){showError(e.message);if(favoritesOnly.checked)render();else summary.textContent='조회 실패';}}
    finally{busy=false;updateSubmit();}
  }
  async function initialize(){
    const version=++regionVersion;retry.hidden=true;clearResults();
    setOptions(sigungu,[],'시·도를 선택하세요');setOptions(dong,[],'시·군·구를 선택하세요');
    try {
      if(!await updateRegions('sido','',saved.region?.sidoCd||'',version)||!sido.value)return;
      if(!await updateRegions('sigungu',sido.value,saved.region?.sigunguCd||'',version)||!sigungu.value)return;
      if(!await updateRegions('dong',sigungu.value,saved.region?.adongCd||'',version)||!dong.value)return;
      await refresh(selection());
    }catch(e){if(version===regionVersion){showError(e.message);retry.hidden=false;if(favoritesOnly.checked)render();else summary.textContent='지역 목록을 불러오지 못했습니다.';}}
  }
  sido.addEventListener('change',async()=>{
    const version=++regionVersion;clearResults();setOptions(sigungu,[],'시·도를 선택하세요');setOptions(dong,[],'시·군·구를 선택하세요');updateSubmit();
    if(!sido.value)return;
    try{await updateRegions('sigungu',sido.value,'',version);}catch(e){if(version===regionVersion){showError(e.message);retry.hidden=false;}}
  });
  sigungu.addEventListener('change',async()=>{
    const version=++regionVersion;clearResults();setOptions(dong,[],'시·군·구를 선택하세요');updateSubmit();if(!sigungu.value)return;
    try{await updateRegions('dong',sigungu.value,'',version);}catch(e){if(version===regionVersion){showError(e.message);retry.hidden=false;}}
  });
  dong.addEventListener('change',()=>{clearResults();updateSubmit();});
  form.addEventListener('submit',async e=>{e.preventDefault();if(submit.disabled)return;const region=selection();SS.savePreferences({region});await refresh(region);});
  favoritesOnly.addEventListener('change',()=>{document.getElementById('result-title').textContent=favoritesOnly.checked?'즐겨찾기':'검색 결과';if(!favoritesOnly.checked&&!payload){results.replaceChildren();summary.textContent='지역을 선택해 매장을 조회해 주세요.';}else render();});
  window.addEventListener('storage',render);
  keyword.addEventListener('input',render);retry.addEventListener('click',initialize);
  await initialize();
});
