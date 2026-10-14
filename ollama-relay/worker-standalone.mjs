// KEN Story Studio - Ollama relay (Cloudflare dashboard, single file).
// Paste this entire file into the Worker's Edit code editor, then Deploy.
// No API key belongs in this file; the workbench supplies it per request.

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function proxyOllama(request,parts,{fetcher=(...args)=>globalThis.fetch(...args),allowedOrigin}={}){
  const origin=allowedOrigin||new URL(request.url).origin,source=request.headers.get('origin');
  if((source&&source!==origin)||(request.headers.get('sec-fetch-site')==='cross-site'&&source!==origin))return json({error:'不接受其他网站发起的请求。'},403);
  const path=parts.join('/');
  if(!((request.method==='GET'&&path==='models')||(request.method==='POST'&&path==='chat/completions')))return json({error:'此转接仅支持文字生成和模型清单。'},404);
  const auth=request.headers.get('authorization')||'';
  if(!/^Bearer [^\s]{8,4096}$/.test(auth))return json({error:'请在工作台填写自己的 Ollama API 金钥。'},401);
  let payload;
  if(request.method==='POST'){
    if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return json({error:'请求需要 JSON 格式。'},415);
    if(Number(request.headers.get('content-length'))>1_000_000)return json({error:'本次故事内容过大，请分段生成。'},413);
    try{
      const text=await request.text();if(new TextEncoder().encode(text).length>1_000_000)return json({error:'本次故事内容过大，请分段生成。'},413);
      const body=JSON.parse(text);
      if(typeof body.model!=='string'||!body.model.trim()||body.model.length>200||!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>200||body.messages.some(x=>!x||!['system','user','assistant','developer'].includes(x.role)||typeof x.content!=='string'))return json({error:'模型或文字消息格式不正确。'},400);
      payload={model:body.model.trim(),messages:body.messages.map(x=>({role:x.role,content:x.content})),stream:false};
    }catch{return json({error:'请求不是有效的 JSON。'},400);}
  }
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),request.method==='GET'?20_000:240_000);
  const cancel=()=>controller.abort();request.signal.addEventListener('abort',cancel,{once:true});
  try{
    const upstream=await fetcher('https://ollama.com/v1/'+path,{method:request.method,headers:{Authorization:auth,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{}),signal:controller.signal,redirect:'error',cache:'no-store'});
    if(!upstream.ok)return json({error:({400:'Ollama 拒绝本次参数。',401:'Ollama 金钥无效。',402:'Ollama 可用额度不足。',403:'当前账号没有此模型权限。',404:'Ollama 找不到此模型或接口。',429:'Ollama 额度不足或请求太频繁。'})[upstream.status]||'Ollama 暂时无法完成请求。'},upstream.status>=400&&upstream.status<600?upstream.status:502);
    const data=await upstream.json();
    if(path==='models'&&!Array.isArray(data?.data))return json({error:'Ollama 模型清单格式不正确。'},502);
    if(path==='chat/completions'&&typeof data?.choices?.[0]?.message?.content!=='string')return json({error:'Ollama 没有返回完整文字。'},502);
    return json(data);
  }catch{return json({error:controller.signal.aborted?'Ollama 请求逾时或已取消。':'后端暂时无法连接 Ollama，请稍后重试。'},controller.signal.aborted?504:502);}
  finally{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);}
}


export async function handle(request,env={},options={}){
  const allowedOrigin=env.ALLOWED_ORIGIN||'https://yuiyuki95.github.io';
  const url=new URL(request.url),origin=request.headers.get('origin');
  if(url.pathname==='/'&&request.method==='GET')return Response.json({service:'KEN Story Studio Ollama relay',apiBase:url.origin+'/v1',ready:true,inferenceVerified:false},{headers:{'Cache-Control':'no-store'}});
  if(origin!==allowedOrigin)return new Response('Origin not allowed',{status:403,headers:{'Cache-Control':'no-store'}});
  const cors={'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Vary':'Origin','Cache-Control':'no-store'};
  if(request.method==='OPTIONS'){
    const method=request.headers.get('access-control-request-method');
    const headers=(request.headers.get('access-control-request-headers')||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
    if(!['GET','POST'].includes(method)||headers.some(x=>!['authorization','content-type'].includes(x)))return new Response(null,{status:403,headers:cors});
    return new Response(null,{status:204,headers:cors});
  }
  if(!url.pathname.startsWith('/v1/'))return new Response(null,{status:404,headers:cors});
  const response=await proxyOllama(request,url.pathname.slice(4).split('/'),{...options,allowedOrigin});
  const result=new Response(response.body,{status:response.status,headers:response.headers});
  for(const [key,value]of Object.entries(cors))result.headers.set(key,value);
  return result;
}

export default {fetch:handle};
