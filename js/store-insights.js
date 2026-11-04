window.SweetSpotInsights={render(stores,store){
  const el=id=>document.getElementById(id),node=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n;};
  el('store-insight-results').replaceChildren();
  if(!store){el('store-insight-summary').textContent='분석할 매장을 선택해 주세요.';return;}
  const nearby=window.SweetSpotGeo.nearby(stores,store,Infinity),counts=[250,500,1000].map(r=>nearby.filter(x=>x.distance<=r).length);
  const table=document.createElement('table');table.className='compare-table';const caption=node('caption',store.bizesNm+' 주변 분석');caption.className='visually-label';table.append(caption);
  const body=document.createElement('tbody');[250,500,1000].forEach((r,i)=>{const row=document.createElement('tr'),th=node('th',(r===1000?'1km':r+'m')+' 안 다른 매장');th.scope='row';row.append(th,node('td',counts[i]+'곳'));body.append(row);});
  const row=document.createElement('tr'),th=node('th','가장 가까운 다른 매장'),cell=document.createElement('td');th.scope='row';const nearest=nearby[0];cell.append(node('strong',nearest?(nearest.distance===0?'같은 좌표':nearest.distance<1?'1m 미만':Math.round(nearest.distance).toLocaleString()+'m'):'조회된 다른 매장 없음'));if(nearest)cell.append(node('small',nearest.bizesNm));row.append(th,cell);body.append(row);table.append(body);el('store-insight-results').append(table);
  el('store-insight-summary').textContent=nearby.length?'250m 안에 다른 매장이 '+counts[0]+'곳 있어요. 500m까지 넓히면 '+(counts[1]-counts[0])+'곳, 1km까지 더 넓히면 '+(counts[2]-counts[1])+'곳이 추가돼요.':'현재 조회 지역에는 비교할 다른 매장이 없습니다.';
}};
