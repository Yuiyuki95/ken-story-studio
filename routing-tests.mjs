import test from 'node:test';
import assert from 'node:assert/strict';
import {aiRequest} from './model.mjs';
import {resolveTextConfig} from './text-routing.mjs';
import {textModels} from './providers.mjs';
const local='http://localhost:11434/v1',cloud='https://relay.test/v1';
const config={textMode:'auto',localBase:local,localModel:'fixture-local:8b',textBase:cloud,textModel:'fixture-cloud',textKey:'CLOUD_FIXTURE_ONLY'};
const request=()=>({model:config.textModel,messages:[{role:'user',content:'fixture story'}]});
const success=()=>Response.json({choices:[{message:{content:'{"ok":true}'}}]});
async function usingFetch(fetcher,run){const previous=globalThis.fetch;try{globalThis.fetch=fetcher;await run();}finally{globalThis.fetch=previous;}}
test('automatic mode probes without cloud credentials and generates with the local model',async()=>{
  const calls=[];await usingFetch(async(url,options)=>{calls.push({url,options});if(url===local+'/models')return Response.json({data:[{id:config.localModel}]});assert.equal(url,local+'/chat/completions');assert.equal(JSON.parse(options.body).model,config.localModel);return success();},async()=>{await aiRequest(config,'text','chat/completions',request());});
  assert.equal(calls.length,2);for(const call of calls){assert.equal(call.options.headers.Authorization,undefined);assert(!JSON.stringify(call.options).includes(config.textKey));}
});
test('an unreachable local service selects cloud with its own model and credential',async()=>{
  const calls=[];await usingFetch(async(url,options)=>{calls.push(url);if(url===local+'/models')throw new TypeError('offline');assert.equal(url,cloud+'/chat/completions');assert.equal(options.headers.Authorization,'Bearer '+config.textKey);assert.equal(JSON.parse(options.body).model,config.textModel);return success();},async()=>{await aiRequest(config,'text','chat/completions',request());});assert.equal(calls.length,2);
});
test('automatic discovery excludes cloud tags, and a missing explicit model selects cloud',async()=>{
  const discovered=await resolveTextConfig({...config,localModel:''},{fetcher:async()=>Response.json({data:[{id:'remote:cloud'},{id:'remote:120b-cloud'},{id:'installed:4b'}]})});assert.equal(discovered.resolvedTextSource,'local');assert.equal(discovered.textModel,'installed:4b');
  const missing=await resolveTextConfig(config,{fetcher:async()=>Response.json({data:[{id:'different:4b'}]})});assert.equal(missing.resolvedTextSource,'cloud');assert.equal(missing.textModel,config.textModel);
});
test('an interrupted local generation is never repeated on cloud',async()=>{
  const calls=[];await usingFetch(async(url)=>{calls.push(url);if(url.endsWith('/models'))return Response.json({data:[{id:config.localModel}]});throw new TypeError('connection lost after sending');},async()=>{await assert.rejects(()=>aiRequest(config,'text','chat/completions',request()));});assert.deepEqual(calls,[local+'/models',local+'/chat/completions']);
});
test('local-only mode never falls back, and cloud-only mode does not probe local',async()=>{
  const calls=[];await usingFetch(async(url)=>{calls.push(url);throw new TypeError('offline');},async()=>assert.rejects(()=>aiRequest({...config,textMode:'local'},'text','chat/completions',request())));assert.deepEqual(calls,[local+'/chat/completions']);
  calls.length=0;await usingFetch(async(url)=>{calls.push(url);return success();},async()=>aiRequest({...config,textMode:'cloud'},'text','chat/completions',request()));assert.deepEqual(calls,[cloud+'/chat/completions']);
});
test('local model lists require no key and hide cloud-tagged models',async()=>{
  await usingFetch(async(url,options)=>{assert.equal(url,local+'/models');assert.equal(options.headers.Authorization,undefined);return Response.json({data:[{id:'installed:4b'},{id:'remote:cloud'}]});},async()=>assert.deepEqual(await textModels({...config,textMode:'local'}),['installed:4b']));
});
test('local authentication is separate and unsafe endpoints never trigger cloud generation',async()=>{
  await usingFetch(async(url,options)=>{assert.equal(url,local+'/chat/completions');assert.equal(options.headers.Authorization,'Bearer LOCAL_FIXTURE_ONLY');return success();},async()=>aiRequest({...config,textMode:'local',localKey:'LOCAL_FIXTURE_ONLY'},'text','chat/completions',request()));
  let calls=0;await usingFetch(async()=>{calls++;return success();},async()=>{
    await assert.rejects(()=>aiRequest({...config,localBase:'http://192.168.1.20:11434/v1'},'text','chat/completions',request()));
    await assert.rejects(()=>aiRequest({...config,localModel:'remote:cloud'},'text','chat/completions',request()));
  });assert.equal(calls,0);
});
test('a local probe timeout selects cloud before any generation is sent',async()=>{
  const selected=await resolveTextConfig(config,{timeout:5,fetcher:(_url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError')),{once:true}))});assert.equal(selected.resolvedTextSource,'cloud');
});
test('image requests keep their image provider and never run a local text probe',async()=>{
  const imageConfig={...config,imageBase:'https://image.test/v1',imageKey:'IMAGE_FIXTURE_ONLY'};
  let calls=0;await usingFetch(async(url,options)=>{calls++;assert.equal(url,'https://image.test/v1/images/generations');assert.equal(options.headers.Authorization,'Bearer IMAGE_FIXTURE_ONLY');return Response.json({data:[]});},async()=>aiRequest(imageConfig,'image','images/generations',{model:'fixture-image'}));assert.equal(calls,1);
});
