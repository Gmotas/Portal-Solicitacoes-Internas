/* © 2026 Gabriel Mota Silva. Todos os direitos reservados. Consulte COPYRIGHT.md e LICENSE. */
const $=s=>document.querySelector(s);
const state={user:null,items:[],page:'dashboard'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(url,opt={}){const r=await fetch(url,{...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Falha na operação.');return d;}
function toast(s){const e=$('#toast');e.textContent=s;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2800);}
function login(u){state.user=u;$('#login').classList.add('hidden');$('#app').classList.remove('hidden');$('#user-name').textContent=u.name;dashboard();}
function showLogin(){$('#app').classList.add('hidden');$('#login').classList.remove('hidden');}
function date(v){return v?new Date(v.replace(' ','T')+'Z').toLocaleDateString('pt-BR'):'—';}
function badge(s){return '<span class="badge '+s.replace(' ','-')+'">'+esc(s)+'</span>';}
function row(r){return '<tr><td>#'+String(r.id).padStart(4,'0')+'</td><td><b>'+esc(r.title)+'</b><br>'+esc(r.description)+'</td><td>'+esc(r.category)+'</td><td>'+esc(r.requester)+'</td><td>'+date(r.createdAt)+'</td><td>'+badge(r.status)+'</td><td><button data-detail="'+r.id+'">Ver/Status</button> '+(r.status==='Aberto'&&r.userId===state.user.id?'<button data-edit="'+r.id+'">Editar</button> <button data-delete="'+r.id+'">Excluir</button>':'')+'</td></tr>';}
function table(items){return items.length?'<div class="table-wrap"><table><thead><tr><th>Código</th><th>Solicitação</th><th>Categoria</th><th>Solicitante</th><th>Abertura</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+items.map(row).join('')+'</tbody></table></div>':'<div class="empty">Nenhuma solicitação encontrada.</div>';}
async function dashboard(){try{const [s,items]=await Promise.all([api('/api/dashboard'),api('/api/requests')]);$('#total').textContent=s.total;$('#open').textContent=s.abertas;$('#progress').textContent=s.atendimento;$('#done').textContent=s.concluidas;$('#recent').innerHTML=table(items.slice(0,5));}catch(e){toast(e.message);}}
function setPage(p){state.page=p;$('#dashboard').classList.toggle('hidden',p!=='dashboard');$('#requests').classList.toggle('hidden',p!=='requests');$('#page-title').textContent=p==='dashboard'?'Visão geral':'Solicitações';document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===p));if(p==='requests')loadItems();}
async function loadItems(){try{const p=new URLSearchParams();[['q','#q'],['category','#category'],['status','#status'],['from','#from'],['to','#to']].forEach(([k,s])=>{if($(s).value)p.set(k,$(s).value)});state.items=await api('/api/requests?'+p);$('#all').innerHTML=table(state.items);}catch(e){toast(e.message);}}
function openForm(r=null){$('#request-form').reset();$('#form-error').textContent='';$('#edit-id').value=r?.id||'';$('#modal-title').textContent=r?'Editar solicitação':'Nova solicitação';$('#title').value=r?.title||'';$('#cat').value=r?.category||'';$('#description').value=r?.description||'';$('#modal').classList.remove('hidden');}
function closeForm(){$('#modal').classList.add('hidden');}
async function refresh(){await dashboard();if(state.page==='requests')await loadItems();}
async function details(id){const r=await api('/api/requests/'+id);const s=prompt('Solicitação: '+r.title+'\nDescrição: '+r.description+'\nStatus: '+r.status+'\nDigite status (Aberto, Em Atendimento, Concluído) ou cancele:');if(s&&['Aberto','Em Atendimento','Concluído'].includes(s)){await api('/api/requests/'+id+'/status',{method:'PUT',body:JSON.stringify({status:s})});toast('Status atualizado.');await refresh();}else if(s)toast('Status inválido.');}
$('#login-form').addEventListener('submit',async e=>{e.preventDefault();$('#login-error').textContent='';try{login(await api('/api/login',{method:'POST',body:JSON.stringify({username:$('#username').value,password:$('#password').value})}));}catch(err){$('#login-error').textContent=err.message;}});
$('#logout').addEventListener('click',async()=>{try{await api('/api/logout',{method:'POST',body:'{}'});}catch{}state.user=null;showLogin();});
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));
$('#new').addEventListener('click',()=>openForm());$('#close').addEventListener('click',closeForm);
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeForm();});
$('#request-form').addEventListener('submit',async e=>{e.preventDefault();const id=$('#edit-id').value;const body={title:$('#title').value,category:$('#cat').value,description:$('#description').value};try{await api(id?'/api/requests/'+id:'/api/requests',{method:id?'PATCH':'POST',body:JSON.stringify(body)});closeForm();toast(id?'Solicitação atualizada.':'Solicitação criada.');await refresh();}catch(err){$('#form-error').textContent=err.message;}});
['#q','#category','#status','#from','#to'].forEach(s=>$(s).addEventListener(s==='#q'?'input':'change',loadItems));
$('#clear').addEventListener('click',()=>{['#q','#category','#status','#from','#to'].forEach(s=>$(s).value='');loadItems();});
document.body.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{if(b.dataset.detail)await details(b.dataset.detail);if(b.dataset.edit){const r=await api('/api/requests/'+b.dataset.edit);openForm(r);}if(b.dataset.delete&&confirm('Deseja excluir esta solicitação?')){await api('/api/requests/'+b.dataset.delete,{method:'DELETE'});toast('Solicitação excluída.');await refresh();}}catch(err){toast(err.message);}});
api('/api/me').then(login).catch(showLogin);
