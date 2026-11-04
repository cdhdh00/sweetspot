window.SweetSpotGeo=(()=>{
  const valid=x=>x&&x.lat!==''&&x.lon!==''&&x.lat!=null&&x.lon!=null&&Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lon))&&Number(x.lat)>=32&&Number(x.lat)<=40&&Number(x.lon)>=123&&Number(x.lon)<=133;
  function distance(a,b){const r=Math.PI/180,dl=(Number(b.lat)-Number(a.lat))*r,dn=(Number(b.lon)-Number(a.lon))*r,h=Math.sin(dl/2)**2+Math.cos(Number(a.lat)*r)*Math.cos(Number(b.lat)*r)*Math.sin(dn/2)**2;return 6371000*2*Math.atan2(Math.sqrt(Math.min(1,h)),Math.sqrt(Math.max(0,1-h)));}
  function nearby(items,anchor,radius=500){if(!valid(anchor))return [];return items.filter(x=>valid(x)&&x.bizesId!==anchor.bizesId).map(x=>({...x,distance:distance(anchor,x)})).filter(x=>x.distance<=radius).sort((a,b)=>a.distance-b.distance||String(a.bizesNm).localeCompare(String(b.bizesNm),'ko'));}
  function startingPoints(items,radius=500){
    const points=items.filter(valid),grid=new Map(),cell=x=>[Math.floor(Number(x.lat)/.005),Math.floor(Number(x.lon)/.005)];
    for(const p of points){const key=cell(p).join(':');if(!grid.has(key))grid.set(key,[]);grid.get(key).push(p);}
    const span=Math.ceil(radius/400)+1;
    const ranked=points.map(p=>{const [a,b]=cell(p);let count=0;for(let i=-span;i<=span;i++)for(let j=-span;j<=span;j++)for(const q of grid.get(`${a+i}:${b+j}`)||[])if(p.bizesId!==q.bizesId&&distance(p,q)<=radius)count++;return{store:p,count};}).sort((a,b)=>b.count-a.count||String(a.store.bizesNm).localeCompare(String(b.store.bizesNm),'ko'));
    const chosen=[];for(const row of ranked){if(!row.count)break;if(chosen.every(x=>distance(row.store,x.store)>radius)){chosen.push(row);if(chosen.length===3)break;}}return chosen;
  }
  return{valid,distance,nearby,startingPoints};
})();
