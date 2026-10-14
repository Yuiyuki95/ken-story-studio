import test from 'node:test';
import assert from 'node:assert/strict';
import {handle} from './worker.mjs';
const origin='https://yuiyuki95.github.io';
const request=(path='chat/completions',extra={})=>new Request('https://relay.test/v1/'+path,{method:'POST',headers:{origin,Authorization:'Bearer FIXTURE_KEY_ONLY','Content-Type':'application/json'},body:JSON.stringify({model:'gemma4:31b',messages:[{role:'user',content:'hello'}]}),...extra});
test('preflight allows only the configured origin, methods and headers',async()=>{
  const preflight=new Request('https://relay.test/v1/chat/completions',{method:'OPTIONS',headers:{origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});const result=await handle(preflight);assert.equal(result.status,204);assert.equal(result.headers.get('access-control-allow-origin'),origin);assert.equal((await handle(new Request(preflight,{headers:{origin:'https://other.test','Access-Control-Request-Method':'POST'}}))).status,403);
});
test('forwards to a fixed Ollama endpoint and does not echo credentials',async()=>{
  const result=await handle(request(),{}, {fetcher:async(url,options)=>{assert.equal(url,'https://ollama.com/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer FIXTURE_KEY_ONLY');assert.equal(options.redirect,'error');assert.equal(JSON.parse(options.body).stream,false);return Response.json({choices:[{message:{content:'{"ok":true}'}}]});}});assert.equal(result.status,200);assert.equal(result.headers.get('access-control-allow-origin'),origin);assert.equal(result.headers.get('cache-control'),'no-store');assert(!(await result.text()).includes('FIXTURE_KEY_ONLY'));
});
test('rejects invalid credentials, arbitrary paths and malformed payloads before upstream',async()=>{
  const options={fetcher:()=>{throw Error('must not call upstream');}};assert.equal((await handle(request('chat/completions',{headers:{origin,'Content-Type':'application/json'}}),{},options)).status,401);assert.equal((await handle(request('https://evil.test'),{},options)).status,404);assert.equal((await handle(request('chat/completions',{body:'broken'}),{},options)).status,400);assert.equal((await handle(request('chat/completions',{body:JSON.stringify({model:'x',messages:[{role:'user',content:{url:'evil'}}]})}),{},options)).status,400);
});
test('model discovery is GET and provider error bodies are sanitized',async()=>{
  const get=request('models',{method:'GET',body:undefined});const result=await handle(get,{}, {fetcher:async(_url,options)=>{assert.equal(options.body,undefined);return Response.json({data:[{id:'gemma4:31b'}]});}});assert.equal((await result.json()).data[0].id,'gemma4:31b');const failed=await handle(get,{}, {fetcher:async()=>new Response('REFLECTED_FIXTURE_KEY_ONLY',{status:401})});assert.equal(failed.status,401);assert(!(await failed.text()).includes('FIXTURE_KEY_ONLY'));
});
test('network failures and invalid upstream JSON are reported with CORS headers',async()=>{
  for(const fetcher of [async()=>{throw new TypeError('network');},async()=>new Response('bad json')]){const result=await handle(request(),{}, {fetcher});assert.equal(result.status,502);assert.equal(result.headers.get('access-control-allow-origin'),origin);}
});
