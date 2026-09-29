/* © 2026 Gabriel Mota Silva. Todos os direitos reservados.
 * Projeto: Portal de Solicitações Internas. Uso para avaliação técnica.
 * Consulte COPYRIGHT.md e LICENSE.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const root = __dirname;
const pub = path.join(root, 'public');
const db = new DatabaseSync(path.join(root, 'portal.db'));
db.exec("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE, salt TEXT, pass TEXT, name TEXT)");
db.exec("CREATE TABLE IF NOT EXISTS requests(id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Aberto', user_id INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)");
const sessions = new Map();
const cats = ['TI','RH','Compras','Financeiro','Infraestrutura'];
const states = ['Aberto','Em Atendimento','Concluído'];
const hash = (p,s) => crypto.scryptSync(p,s,64).toString('hex');
if (!db.prepare('SELECT id FROM users WHERE username=?').get('admin')) {
 const salt=crypto.randomBytes(16).toString('hex');
 db.prepare('INSERT INTO users(username,salt,pass,name) VALUES(?,?,?,?)').run('admin',salt,hash('Admin123!',salt),'Administrador');
}
const send=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
const sid=req=>(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('sid='))?.slice(4);
const user=req=>sessions.get(sid(req));
async function readBody(req){let raw='';for await(const c of req){raw+=c;if(raw.length>1000000)throw Error('Corpo muito grande');}return JSON.parse(raw||'{}');}
const select="SELECT r.*,u.name AS requester FROM requests r JOIN users u ON u.id=r.user_id";
const clean=r=>({id:r.id,title:r.title,description:r.description,category:r.category,status:r.status,userId:r.user_id,requester:r.requester,createdAt:r.created_at,updatedAt:r.updated_at});
async function handle(req,res){
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/api/health')return send(res,200,{ok:true});
 if(req.method==='POST'&&url.pathname==='/api/login'){
  let b;try{b=await readBody(req)}catch{return send(res,400,{error:'Dados inválidos'});}
  const u=db.prepare('SELECT * FROM users WHERE username=?').get(String(b.username||''));
  if(!u||hash(String(b.password||''),u.salt)!==u.pass)return send(res,401,{error:'Usuário ou senha inválidos.'});
  const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{id:u.id,username:u.username,name:u.name});
  res.setHeader('Set-Cookie','sid='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800');
  return send(res,200,{id:u.id,username:u.username,name:u.name});
 }
 if(url.pathname.startsWith('/api/')){
  const me=user(req);
  if(req.method==='POST'&&url.pathname==='/api/logout'){if(sid(req))sessions.delete(sid(req));res.setHeader('Set-Cookie','sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(res,200,{ok:true});}
  if(!me)return send(res,401,{error:'Faça login para continuar.'});
  if(req.method==='GET'&&url.pathname==='/api/me')return send(res,200,me);
  if(req.method==='GET'&&url.pathname==='/api/dashboard'){
   const all=db.prepare('SELECT status,COUNT(*) n FROM requests GROUP BY status').all();
   const m=Object.fromEntries(all.map(x=>[x.status,x.n]));
   return send(res,200,{total:db.prepare('SELECT COUNT(*) n FROM requests').get().n,abertas:m['Aberto']||0,atendimento:m['Em Atendimento']||0,concluidas:m['Concluído']||0});
  }
  if(req.method==='GET'&&url.pathname==='/api/requests'){
   const wh=[],args=[];
   for(const [key,col] of [['from','date(r.created_at)>=date(?)'],['to','date(r.created_at)<=date(?)']])if(url.searchParams.get(key)){wh.push(col);args.push(url.searchParams.get(key));}
   for(const [key,col,valid] of [['category','r.category=?',cats],['status','r.status=?',states]]){const v=url.searchParams.get(key);if(valid.includes(v)){wh.push(col);args.push(v);}}
   const q=url.searchParams.get('q');if(q){wh.push('r.title LIKE ?');args.push('%'+q.slice(0,100)+'%');}
   const rows=db.prepare(select+(wh.length?' WHERE '+wh.join(' AND '):'')+' ORDER BY r.id DESC').all(...args);
   return send(res,200,rows.map(clean));
  }
  if(req.method==='POST'&&url.pathname==='/api/requests'){
   let b;try{b=await readBody(req)}catch{return send(res,400,{error:'JSON inválido'});}
   const title=String(b.title||'').trim(),desc=String(b.description||'').trim();
   if(title.length<3||title.length>120||desc.length<3||desc.length>5000||!cats.includes(b.category))return send(res,400,{error:'Confira título, descrição e categoria.'});
   const x=db.prepare('INSERT INTO requests(title,description,category,user_id) VALUES(?,?,?,?)').run(title,desc,b.category,me.id);
   return send(res,201,clean(db.prepare(select+' WHERE r.id=?').get(Number(x.lastInsertRowid))));
  }
  const match=url.pathname.match(/^\/api\/requests\/(\d+)(?:\/(status))?$/);
  if(match){
   const id=Number(match[1]),row=db.prepare(select+' WHERE r.id=?').get(id);
   if(!row)return send(res,404,{error:'Solicitação não encontrada.'});
   if(req.method==='GET'&&!match[2])return send(res,200,clean(row));
   if(req.method==='PATCH'&&!match[2]){
    if(row.status!=='Aberto'||row.user_id!==me.id)return send(res,403,{error:'Somente o solicitante pode editar uma solicitação aberta.'});
    let b;try{b=await readBody(req)}catch{return send(res,400,{error:'JSON inválido'});}
    const t=String(b.title||'').trim(),d=String(b.description||'').trim();
    if(t.length<3||t.length>120||d.length<3||d.length>5000||!cats.includes(b.category))return send(res,400,{error:'Confira os campos.'});
    db.prepare('UPDATE requests SET title=?,description=?,category=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(t,d,b.category,id);
    return send(res,200,clean(db.prepare(select+' WHERE r.id=?').get(id)));
   }
   if(req.method==='DELETE'&&!match[2]){
    if(row.status!=='Aberto'||row.user_id!==me.id)return send(res,403,{error:'Somente o solicitante pode excluir uma solicitação aberta.'});
    db.prepare('DELETE FROM requests WHERE id=?').run(id);return send(res,200,{ok:true});
   }
   if(req.method==='PUT'&&match[2]){
    let b;try{b=await readBody(req)}catch{return send(res,400,{error:'JSON inválido'});}
    if(!states.includes(b.status))return send(res,400,{error:'Status inválido.'});
    db.prepare('UPDATE requests SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(b.status,id);
    return send(res,200,clean(db.prepare(select+' WHERE r.id=?').get(id)));
   }
  }
  return send(res,404,{error:'Rota não encontrada.'});
 }
 const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
 const full=path.resolve(pub,file);
 if(!full.startsWith(path.resolve(pub)+path.sep))return send(res,403,{error:'Acesso negado.'});
 if(!fs.existsSync(full)||!fs.statSync(full).isFile())return send(res,404,{error:'Arquivo não encontrado.'});
 const type={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'}[path.extname(full)]||'application/octet-stream';
 res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff'});fs.createReadStream(full).pipe(res);
}
http.createServer((req,res)=>handle(req,res).catch(e=>{console.error(e);if(!res.headersSent)send(res,500,{error:'Erro interno.'});})).listen(Number(process.env.PORT||3000),()=>console.log('Portal em http://localhost:3000'));
