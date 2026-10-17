export const isCloudModel=id=>/(?:[:\-]cloud)$/i.test(id);
function localBase(config){
  const url=new URL(config.localBase||'http://localhost:11434/v1');
  if(url.username||url.password||url.search||url.hash||!(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw Error('本机使用 localhost；家用远端服务需要 HTTPS 网址。');
  return url.href.replace(/\/+$/,'');
}
export async function probeLocal(config,{fetcher=(...args)=>globalThis.fetch(...args),timeout=2500}={}){
  const base=localBase(config),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const key=config.localKey?.trim();
    const response=await fetcher(base+'/models',{method:'GET',headers:key?{Authorization:'Bearer '+key}:{},signal:controller.signal,cache:'no-store',redirect:'error'});
    if(!response.ok)throw Error('local-unavailable');
    const result=await response.json();
    if(!Array.isArray(result?.data)||result.data.length>1000)throw Error('local-invalid-models');
    const models=[...new Set(result.data.filter(x=>typeof x?.id==='string'&&x.id.trim()&&x.id.length<=200&&!isCloudModel(x.id)).map(x=>x.id))];
    return {base,models};
  }finally{clearTimeout(timer);}
}
export async function resolveTextConfig(config,{path='chat/completions',...options}={}){
  const mode=config.textMode||'cloud';
  if(!['cloud','local','auto'].includes(mode))throw Error('请选择本机、云端或自动模式。');
  const cloud=reason=>({...config,resolvedTextSource:'cloud',routeReason:reason});
  if(mode==='cloud')return cloud('已选择云端');
  const requested=config.localModel?.trim()||'';
  // Validate the endpoint before the fallback boundary; typos must not silently send a story elsewhere.
  const base=localBase(config);
  if(requested&&isCloudModel(requested))throw Error('本机模式请选择已下载的模型，不使用带 cloud 标签的模型。');
  if(mode==='local'&&path==='models')return {...config,textBase:base,textModel:requested,textKey:config.localKey||'',resolvedTextSource:'local',routeReason:'已选择本机'};
  if(mode==='local'&&requested)return {...config,textBase:base,textModel:requested,textKey:config.localKey||'',resolvedTextSource:'local',routeReason:'已选择本机'};
  let discovered;
  try{discovered=await probeLocal(config,options);}catch{
    if(mode==='auto')return cloud('本机无法连接，使用云端');
    throw Error('无法连接本机 Ollama，请确认已启动、允许此网页来源，并允许浏览器访问本地网络。');
  }
  const model=requested?discovered.models.find(id=>id===requested):discovered.models[0];
  if(!model){
    if(mode==='auto')return cloud(requested?'本机没有指定模型，使用云端':'本机没有可用的已下载模型，使用云端');
    throw Error('本机没有可用的已下载模型，请先下载模型或填写正确名称。');
  }
  return {...config,textBase:discovered.base,textModel:model,textKey:config.localKey||'',resolvedTextSource:'local',routeReason:'本机可用，优先使用本机'};
}
