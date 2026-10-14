import {proxyOllama} from './ollama-relay.mjs';

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
