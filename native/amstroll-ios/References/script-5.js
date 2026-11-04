(() => {
 'use strict';
 const KEY='bps.amstroll.v1',DB='bps.amstroll.media.v1';
 let storageOK=true,mediaOK=true,database,opening;
 const memory=new Map(),urls=new Map();
 const now=()=>window.AMSTROLL_NOW?new Date(window.AMSTROLL_NOW):new Date();
 function seed(){
  const C=window.AmstrollCatalog||{},experiences=C.experiences||[];
  return {version:1,anchor:now().toISOString(),session:false,prefs:{minutes:47,start:C.starts?.some(s=>s.id==='central')?'central':C.starts?.[0]?.id,endpoint:'none',mood:'any',transport:'walk',budget:20,walking:45,strictBudget:false},saved:experiences.filter(e=>e.placeIds?.length).slice(0,3).map(e=>({id:e.id,prefs:null})),active:null,journal:[{id:'seed-memory-1',title:'The quieter way through the city',note:'Took the longer way beside the water. Found a bench with the afternoon sun still on it.',rating:'Loved it',minutes:38,date:new Date(+now()-86400000*2).toISOString(),photoKey:'amsterdam-canals',sample:true},{id:'seed-memory-2',title:'A little room in Westerpark',note:'No grand plan. Just green space, a slow lap and enough time to sit for a while.',rating:'Good',minutes:55,date:new Date(+now()-86400000*6).toISOString(),photoKey:'westerpark',sample:true}],geo:null};
 }
 let data;
 try{const stored=localStorage.getItem(KEY);data=stored?JSON.parse(stored):seed();if(!data||data.version!==1||!Array.isArray(data.saved)||!Array.isArray(data.journal))data=seed();data.prefs={...seed().prefs,...data.prefs};}catch{storageOK=false;data=seed();}
 function save(){try{const active=data.active?.plan?.isLive?null:data.active;localStorage.setItem(KEY,JSON.stringify({...data,active}));storageOK=true;return true;}catch{storageOK=false;return false;}}
 save();
 async function db(){if(database)return database;if(opening)return opening;opening=new Promise((resolve,reject)=>{if(!window.indexedDB){mediaOK=false;reject(Error('Media storage is unavailable.'));return;}let req;try{req=indexedDB.open(DB,1);}catch(e){mediaOK=false;reject(e);return;}req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('photos'))req.result.createObjectStore('photos');};req.onsuccess=()=>{database=req.result;database.onversionchange=()=>{database.close();database=null;};resolve(database);};req.onerror=()=>{mediaOK=false;reject(req.error||Error('Media storage is unavailable.'));};req.onblocked=()=>{mediaOK=false;reject(Error('Media storage is blocked by another tab.'));};});try{return await opening;}finally{opening=null;}}
 async function putPhoto(blob){if(!/^image\/(jpeg|png|webp)$/.test(blob.type))throw Error('Choose a JPEG, PNG or WebP photograph.');if(blob.size>8*1024*1024)throw Error('Choose a photograph smaller than 8 MB.');if(!blob.size)throw Error('That file is empty. Choose another photograph.');const id='photo-'+cryptoId();memory.set(id,blob);try{const database=await db();await new Promise((resolve,reject)=>{const tx=database.transaction('photos','readwrite');tx.objectStore('photos').put(blob,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Photo could not be stored.'));});return {id,persistent:true};}catch{mediaOK=false;return {id,persistent:false};}}
 async function getPhoto(id){if(memory.has(id))return memory.get(id);try{const database=await db();return await new Promise((resolve,reject)=>{const req=database.transaction('photos','readonly').objectStore('photos').get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}catch{return null;}}
 async function removePhoto(id){memory.delete(id);revoke(id);try{const database=await db();await new Promise((resolve,reject)=>{const tx=database.transaction('photos','readwrite');tx.objectStore('photos').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch{}}
 function photoUrl(id,blob){revoke(id);const url=URL.createObjectURL(blob);urls.set(id,url);return url;}
 function revoke(id){const url=urls.get(id);if(url){URL.revokeObjectURL(url);urls.delete(id);}}
 function revokeAll(){for(const id of urls.keys())revoke(id);}
 async function reset(){revokeAll();memory.clear();try{const database=await db();await new Promise((resolve,reject)=>{const tx=database.transaction('photos','readwrite');tx.objectStore('photos').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch{}data=seed();data.session=true;save();return data;}
 function cryptoId(){return window.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);}
 window.addEventListener('pagehide',revokeAll);
 window.AmstrollState={get data(){return data;},save,reset,now,cryptoId,putPhoto,getPhoto,removePhoto,photoUrl,revokeAll,get storageOK(){return storageOK;},get mediaOK(){return mediaOK;},namespace:KEY,mediaDatabase:DB};
})();
