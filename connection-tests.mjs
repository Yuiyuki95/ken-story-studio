import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DeviceConnection} from './device-connection.mjs';
import * as model from './model.mjs';

class MemoryStore {
  data=new Map();
  snapshots=[];
  async get(area,key){return structuredClone(this.data.get(area+':'+key));}
  async put(area,key,value){this.data.set(area+':'+key,structuredClone(value));}
  async backup(value){this.snapshots.push(structuredClone(value));}
}
const credentials={owner:'fixture-user',repo:'private-data',token:'FIXTURE_NOT_A_REAL_TOKEN'};
test('remembered credentials survive reload as encrypted, device-only state',async()=>{
  const store=new MemoryStore(),device=new DeviceConnection(store);
  assert.equal(await device.load(),null);
  await device.save(credentials);
  const saved=store.data.get('state:github-remembered-connection');
  assert.equal(saved.key.extractable,false);
  assert.equal(saved.token,undefined);
  assert(!JSON.stringify(saved).includes(credentials.token));
  assert.deepEqual(await new DeviceConnection(store).load(),credentials);
  assert.equal(await store.get('state','current'),undefined);
  await device.clear();assert.equal(await new DeviceConnection(store).load(),null);
});
test('modified device records cannot decrypt a credential for another repository',async()=>{
  const store=new MemoryStore(),device=new DeviceConnection(store);await device.save(credentials);
  store.data.get('state:github-remembered-connection').repo='another-repo';
  await assert.rejects(()=>device.load(),/保存的连接已失效/);
  assert.equal(await device.load(),null);
});

test('app reconnects on reload, keeps conflicts safe, resumes offline and forgets on disconnect',async()=>{
  const originals=new Map();const replace=(key,value)=>{originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
  const oldOpen=model.Store.open;const store=new MemoryStore();
  const base=await readFile(new URL('./app.mjs',import.meta.url),'utf8');let serial=0,unauthorized=false,calls=0;
  const remote=model.workspace();remote.projects[0].title='Cloud fixture';let remoteSha='sha-initial';
  function dom(){const items=new Map();return {items,visibilityState:'visible',addEventListener(){},querySelectorAll(){return [];},querySelector(selector){if(selector.startsWith('meta['))return null;if(!items.has(selector))items.set(selector,{value:'',textContent:'',innerHTML:'',className:'',disabled:false,checked:false,open:false,setAttribute(){},classList:{remove(){}},showModal(){this.open=true;},close(){this.open=false;}});return items.get(selector);}};}
  async function load(){const document=dom();globalThis.document=document;
    const source=base.replaceAll("from './providers.mjs'",`from '${new URL('./providers.mjs',import.meta.url).href}'`).replaceAll("from './model.mjs'",`from '${new URL('./model.mjs',import.meta.url).href}'`).replaceAll("from './device-connection.mjs'",`from '${new URL('./device-connection.mjs',import.meta.url).href}'`).replace(/\nstart\(\);\s*$/,"\nexport const started=start();\nexport {connect,disconnect,resumeConnection,changed,persist,record};\nexport const state=()=>({client:!!client,rememberDevice,conflict:!!conflict,dirty});export {editSheetDialog,deleteSheetDialog};export const liveWorkspace=()=>w;export const dialogButtons=()=>dialogActions;export const stagePreview=(id)=>{sheetId=id;frames=[{}];originalFrames=[{}];};export const previewState=()=>({sheetId,frames:frames.length,originalFrames:originalFrames.length});");
    const app=await import('data:text/javascript;base64,'+Buffer.from(source+'\n//# sourceURL=app-fixture-'+serial+'.mjs\n').toString('base64')+'#'+serial++);await app.started;
    assert(!document.querySelector('#main').textContent.includes('无法开启创作空间'));
    return {app,document};
  }
  try{
    const preferences=new Map();replace('localStorage',{getItem:key=>preferences.get(key)||null,setItem:(key,value)=>preferences.set(key,value)});
    replace('document',dom());replace('window',{addEventListener(){}});replace('location',{hash:'#sync',origin:'https://fixture.test'});replace('navigator',{onLine:true});replace('setInterval',()=>1);replace('setTimeout',()=>1);replace('clearTimeout',()=>{});
    replace('fetch',async(url,options)=>{
      calls++;if(unauthorized)return Response.json({}, {status:401});
      assert.equal(options.headers.Authorization,'Bearer '+credentials.token);
      if(!url.includes('/contents/'))return Response.json({private:true,default_branch:'main'});
      assert.notEqual(options.method,'PUT','reconnecting must not overwrite a conflicting remote');
      return Response.json({sha:remoteSha,encoding:'base64',content:Buffer.from(JSON.stringify(remote)).toString('base64')});
    });model.Store.open=async()=>store;
    const first=await load();assert.equal(first.app.state().client,false);assert.equal(calls,0);
    first.document.querySelector('#gh-owner').value=credentials.owner;first.document.querySelector('#gh-repo').value=credentials.repo;first.document.querySelector('#gh-token').value=credentials.token;first.document.querySelector('#remember-device').checked=true;
    await first.app.connect();assert.equal(first.app.state().client,true);
    assert(!JSON.stringify(first.app.record()).includes(credentials.token));
    const second=await load();assert.equal(second.app.state().client,true);assert.equal(second.app.state().rememberDevice,true);
    second.app.changed();await second.app.persist();remoteSha='sha-newer';
    const conflict=await load();assert.equal(conflict.app.state().conflict,true);assert.equal(conflict.app.state().dirty,true);
    await conflict.app.disconnect();assert.equal(await new DeviceConnection(store).load(),null);
    const disconnected=await load();assert.equal(disconnected.app.state().client,false);
    await new DeviceConnection(store).save(credentials);globalThis.navigator.onLine=false;
    const offline=await load();assert.equal(offline.app.state().client,false);assert.equal(offline.app.state().rememberDevice,true);
    globalThis.navigator.onLine=true;await offline.app.resumeConnection(true);assert.equal(offline.app.state().client,true);
    // Exercise the actual dialog callbacks and preview state without a browser renderer.
    const atlas=await load();const live=atlas.app.liveWorkspace(),project=live.projects[0],path='assets/'+'a'.repeat(64)+'.png';
    live.assetMeta[path]={mime:'image/png',name:'fixture.png',size:1};
    project.assets=[{id:'selected',path,action:'待机 Idle',cols:1,rows:1,count:1},{id:'other',path,action:'待机 Idle',cols:1,rows:1,count:1}];
    atlas.app.stagePreview('selected');atlas.app.editSheetDialog('selected');
    atlas.document.querySelector('#sheet-name').value='Edited atlas';atlas.document.querySelector('#sheet-action').value='跑步 Run';atlas.document.querySelector('#sheet-fps').value='24';atlas.document.querySelector('#sheet-loop').checked=false;
    let snapshots=store.snapshots.length;await atlas.app.dialogButtons()[1].fn();assert.equal(store.snapshots.length,snapshots+1);assert.equal(project.assets[0].name,'Edited atlas');assert.equal(project.assets[0].fps,24);
    atlas.app.deleteSheetDialog('other');await atlas.app.dialogButtons()[0].fn();assert.equal(project.assets.length,2);
    atlas.app.deleteSheetDialog('other');await atlas.app.dialogButtons()[1].fn();assert.equal(project.assets.length,1);assert.equal(atlas.app.previewState().sheetId,'selected');assert.equal(atlas.app.previewState().frames,1);
    snapshots=store.snapshots.length;atlas.app.deleteSheetDialog('selected');await atlas.app.dialogButtons()[1].fn();assert.equal(store.snapshots.length,snapshots+1);assert.equal(store.snapshots.at(-1).projects[0].assets[0].id,'selected');
    assert.deepEqual(atlas.app.previewState(),{sheetId:null,frames:0,originalFrames:0});assert.equal(project.assets.length,0);assert(live.assetMeta[path]);
    unauthorized=true;const expired=await load();assert.equal(expired.app.state().client,false);assert.equal(expired.app.state().rememberDevice,false);assert.equal(await new DeviceConnection(store).load(),null);
  }finally{model.Store.open=oldOpen;for(const [key,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});

