import {aiRequest} from './model.mjs';

export const TEXT_PRESETS={
  'ollama-cloud':{label:'Ollama 云端',textBase:'https://ollama.com/v1',textModel:'gemma4:31b'},
  'openai':{label:'OpenAI',textBase:'https://api.openai.com/v1',textModel:'gpt-4.1-mini'}
};

// Return only public configuration. Credentials never move between providers.
export function textPreset(name){
  const preset=TEXT_PRESETS[name];
  if(!preset)throw Error('未知的文字服务。');
  return {textProvider:name,textBase:preset.textBase,textModel:preset.textModel,textKey:''};
}

export async function textModels(config){
  const result=await aiRequest(config,'text','models',undefined,false,'GET');
  if(!Array.isArray(result?.data))throw Error('服务未返回兼容的模型清单，可手动填写模型名称。');
  const models=[...new Set(result.data.filter(x=>typeof x?.id==='string'&&x.id.trim()&&x.id.length<=200).map(x=>x.id))];
  if(!models.length||models.length>1000)throw Error('模型清单为空或过大，请手动填写模型名称。');
  return models;
}
