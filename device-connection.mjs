// Device-only state, separate from workspace records, backups and exports.
const slot='github-remembered-connection';
const validTarget=x=>x&&/^[A-Za-z0-9-]+$/.test(x.owner)&&/^[A-Za-z0-9_.-]+$/.test(x.repo);
const context=x=>new TextEncoder().encode(x.owner+'/'+x.repo);
export class DeviceConnection {
  constructor(store){this.store=store;}
  async save(connection){
    if(!validTarget(connection)||typeof connection.token!=='string'||!connection.token.trim())throw Error('请先填写并连接有效的私人资料仓库。');
    const {owner,repo}=connection;
    const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:context(connection)},key,new TextEncoder().encode(connection.token.trim()));
    await this.store.put('state',slot,{version:1,owner,repo,key,iv,ciphertext});
  }
  async load(){
    const record=await this.store.get('state',slot);
    if(record==null)return null;
    try{
      if(record.version!==1||!validTarget(record)||record.key?.extractable!==false)throw Error('Invalid saved connection');
      const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:record.iv,additionalData:context(record)},record.key,record.ciphertext);
      const token=new TextDecoder().decode(plaintext);
      if(!token.trim())throw Error('Empty credential');
      return {owner:record.owner,repo:record.repo,token};
    }catch{
      await this.clear();
      throw Error('此装置保存的连接已失效，请重新填写凭证并连接。');
    }
  }
  async clear(){await this.store.put('state',slot,null);}
}
