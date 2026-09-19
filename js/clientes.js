let clientesCache=[];
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
function limparCliente(){document.getElementById("clienteForm").reset();document.getElementById("clienteId").value="";document.getElementById("clienteFormTitle").textContent="Novo cliente";document.getElementById("clienteMessage").textContent="";}
function renderClientes(lista){const c=document.getElementById("clientesLista");if(!lista.length){c.innerHTML='<div class="empty-state">Nenhum cliente cadastrado.</div>';return;}c.innerHTML=`<table><thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>Nascimento</th><th>Ações</th></tr></thead><tbody>${lista.map(x=>`<tr><td>${esc(x.nome)}</td><td>${esc(x.telefone)}</td><td>${esc(x.email)}</td><td>${esc(x.data_nascimento)}</td><td class="actions-cell"><button class="btn-small btn-ficha" onclick="abrirFichaCliente('${x.id}')">Ficha</button><button class="btn-small" onclick="editarCliente('${x.id}')">Editar</button><button class="btn-small danger" onclick="excluirCliente('${x.id}')">Excluir</button></td></tr>`).join("")}</tbody></table>`;}
async function carregarClientes(){const{data,error}=await supabaseClient.from("clientes").select("id,nome,telefone,email,data_nascimento,observacoes,ativo").eq("ativo",true).order("nome");if(error){console.error(error);return;}clientesCache=data||[];renderClientes(clientesCache);}
window.editarCliente=id=>{const x=clientesCache.find(c=>c.id===id);if(!x)return;clienteId.value=x.id;clienteNome.value=x.nome||"";clienteTelefone.value=x.telefone||"";clienteEmail.value=x.email||"";clienteNascimento.value=x.data_nascimento||"";clienteObservacoes.value=x.observacoes||"";clienteFormTitle.textContent="Editar cliente";clienteFormPanel.scrollIntoView({behavior:"smooth"});}
window.excluirCliente=async id=>{const x=clientesCache.find(c=>c.id===id);if(!x||!confirm(`Excluir ${x.nome} da lista de clientes?`))return;const{error}=await supabaseClient.from("clientes").update({ativo:false}).eq("id",id);if(error){alert("Não foi possível excluir o cliente.");console.error(error);return;}limparCliente();await carregarClientes();}
document.addEventListener("DOMContentLoaded",async()=>{await carregarClientes();novoClienteBtn.onclick=()=>{limparCliente();clienteFormPanel.scrollIntoView({behavior:"smooth"});};cancelarClienteBtn.onclick=limparCliente;buscaCliente.oninput=e=>{const t=e.target.value.toLowerCase();renderClientes(clientesCache.filter(x=>[x.nome,x.telefone,x.email].some(v=>(v||"").toLowerCase().includes(t))));};clienteForm.onsubmit=async e=>{e.preventDefault();const id=clienteId.value,p={nome:clienteNome.value.trim(),telefone:clienteTelefone.value.trim(),email:clienteEmail.value.trim()||null,data_nascimento:clienteNascimento.value||null,observacoes:clienteObservacoes.value.trim()||null,ativo:true};const q=id?supabaseClient.from("clientes").update(p).eq("id",id):supabaseClient.from("clientes").insert(p);const{error}=await q;if(error){clienteMessage.textContent=error.message.includes("duplicate")?"Este telefone já está cadastrado.":"Erro ao salvar cliente.";clienteMessage.className="form-message error";return;}clienteMessage.textContent=id?"Cliente atualizado com sucesso.":"Cliente cadastrado com sucesso.";clienteMessage.className="form-message success";setTimeout(async()=>{limparCliente();await carregarClientes();},400);};});


// ===== V1.9 - Ficha e Histórico da Cliente =====
let fichaClienteId=null;
const fichaMoney=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fichaSafe=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const fichaStatus={agendado:"Agendado",confirmado:"Confirmado",em_atendimento:"Em atendimento",concluido:"Concluído",cancelado:"Cancelado",nao_compareceu:"Não compareceu"};

async function abrirFichaCliente(id){
 fichaClienteId=id;
 const modal=document.getElementById("fichaClienteModal");
 if(!modal)return;
 modal.classList.remove("hidden");
 document.getElementById("fichaHistorico").innerHTML='<tr><td colspan="5">Carregando...</td></tr>';
 const [cr,ar,pr,sr,nr]=await Promise.all([
  supabaseClient.from("clientes").select("*").eq("id",id).single(),
  supabaseClient.from("agendamentos").select("*").eq("cliente_id",id).order("inicio",{ascending:false}),
  supabaseClient.from("profissionais").select("id,nome"),
  supabaseClient.from("servicos").select("id,nome"),
  supabaseClient.from("cliente_anotacoes").select("*").eq("cliente_id",id).order("criado_em",{ascending:false})
 ]);
 if(cr.error||ar.error||pr.error||sr.error||nr.error){alert("Não foi possível abrir a ficha: "+(cr.error||ar.error||pr.error||sr.error||nr.error).message);return}
 const c=cr.data,a=ar.data||[],pros=pr.data||[],serv=sr.data||[];
 document.getElementById("fichaNome").textContent=c.nome||"Cliente";
 document.getElementById("fichaContato").textContent=[c.telefone,c.email].filter(Boolean).join(" • ")||"Sem contato informado";
 const concl=a.filter(x=>x.status==="concluido");
 document.getElementById("fichaVisitas").textContent=concl.length;
 document.getElementById("fichaGasto").textContent=fichaMoney(concl.reduce((t,x)=>t+Number(x.valor_pago||0),0));
 document.getElementById("fichaUltimo").textContent=concl.length?new Date(concl[0].inicio).toLocaleDateString("pt-BR"):"—";
 let ids=a.map(x=>x.id),links=[];
 if(ids.length){const lr=await supabaseClient.from("agendamento_servicos").select("agendamento_id,servico_id").in("agendamento_id",ids);if(!lr.error)links=lr.data||[]}
 const counts={};links.filter(l=>concl.some(a=>a.id===l.agendamento_id)).forEach(l=>counts[l.servico_id]=(counts[l.servico_id]||0)+1);
 const fav=Object.entries(counts).sort((x,y)=>y[1]-x[1])[0];
 document.getElementById("fichaFavorito").textContent=fav?(serv.find(s=>s.id===fav[0])?.nome||"—"):"—";
 const pn=id=>pros.find(p=>p.id===id)?.nome||"Profissional";
 const serviceNames=agid=>links.filter(l=>l.agendamento_id===agid).map(l=>serv.find(s=>s.id===l.servico_id)?.nome).filter(Boolean).join(", ")||"—";
 document.getElementById("fichaHistorico").innerHTML=a.length?a.map(x=>`<tr><td>${new Date(x.inicio).toLocaleString("pt-BR")}</td><td>${fichaSafe(serviceNames(x.id))}</td><td>${fichaSafe(pn(x.profissional_id))}</td><td>${fichaStatus[x.status]||x.status}</td><td>${fichaMoney(x.valor_pago||0)}</td></tr>`).join(""):'<tr><td colspan="5">Nenhum atendimento registrado.</td></tr>';
 renderAnotacoes(nr.data||[]);
}
function renderAnotacoes(rows){
 const el=document.getElementById("listaAnotacoes");
 el.innerHTML=rows.length?rows.map(n=>`<article class="client-note"><div><p>${fichaSafe(n.anotacao)}</p><small>${new Date(n.criado_em).toLocaleString("pt-BR")}</small></div><button type="button" class="btn-mini danger-lite" onclick="excluirAnotacao('${n.id}')">Excluir</button></article>`).join(""):'<div class="empty-state">Nenhuma anotação cadastrada.</div>';
}
window.excluirAnotacao=async id=>{if(!confirm("Excluir esta anotação?"))return;const {error}=await supabaseClient.from("cliente_anotacoes").delete().eq("id",id);if(error)return alert(error.message);abrirFichaCliente(fichaClienteId)};
window.abrirFichaCliente=abrirFichaCliente;

document.addEventListener("DOMContentLoaded",()=>{
 const close=()=>document.getElementById("fichaClienteModal")?.classList.add("hidden");
 document.getElementById("fecharFicha")?.addEventListener("click",close);
 document.getElementById("anotacaoForm")?.addEventListener("submit",async e=>{
  e.preventDefault();const text=document.getElementById("novaAnotacao").value.trim();if(!text||!fichaClienteId)return;
  const {data:{user}}=await supabaseClient.auth.getUser();
  const {error}=await supabaseClient.from("cliente_anotacoes").insert({cliente_id:fichaClienteId,anotacao:text,criado_por:user?.id||null});
  if(error)return alert(error.message);
  document.getElementById("novaAnotacao").value="";
  abrirFichaCliente(fichaClienteId);
 });
 // Adiciona botão Ficha aos cards/linhas de cliente sempre que forem renderizados.
 const obs=new MutationObserver(()=>{
  document.querySelectorAll('[data-id]').forEach(el=>{
   const id=el.getAttribute("data-id");
   if(!id||el.querySelector(".btn-ficha"))return;
   const area=el.querySelector(".actions,.card-actions,.cliente-actions");
   if(area){const b=document.createElement("button");b.type="button";b.className="btn-secondary btn-ficha";b.textContent="Ficha";b.onclick=e=>{e.stopPropagation();abrirFichaCliente(id)};area.prepend(b)}
  });
 });
 const root=document.querySelector("main");if(root)obs.observe(root,{childList:true,subtree:true});
});


// ===== V1.9.2 - Ficha Técnica de Beleza =====
async function carregarFichaTecnica(clienteId){
 const {data,error}=await supabaseClient.from("cliente_ficha_tecnica").select("*").eq("cliente_id",clienteId).maybeSingle();
 if(error){console.error(error);return}
 const v=(id,val)=>{const e=document.getElementById(id);if(e)e.value=val||""};
 v("ftPreferencias",data?.preferencias);v("ftAlergias",data?.alergias_sensibilidades);v("ftProdutos",data?.produtos_utilizados);
 v("ftCabeloQuimicas",data?.cabelo_quimicas);v("ftCabeloCor",data?.cabelo_cor_tonalidade);v("ftCabeloProcedimentos",data?.cabelo_procedimentos);
 v("ftUnhasFormato",data?.unhas_formato);v("ftUnhasTecnica",data?.unhas_tecnica);v("ftUnhasObs",data?.unhas_observacoes);v("ftRecomendacoes",data?.recomendacoes_proximo_atendimento);
 const st=document.getElementById("fichaTecnicaStatus");
 if(st)st.textContent=data?.atualizado_em?"Atualizada em "+new Date(data.atualizado_em).toLocaleString("pt-BR"):"Ainda não preenchida";
}
const _abrirFichaClienteV19=abrirFichaCliente;
abrirFichaCliente=async function(id){
 await _abrirFichaClienteV19(id);
 await carregarFichaTecnica(id);
};
window.abrirFichaCliente=abrirFichaCliente;

document.addEventListener("DOMContentLoaded",()=>{
 document.getElementById("fichaTecnicaForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!fichaClienteId)return;
  const g=id=>document.getElementById(id)?.value.trim()||null;
  const {data:{user}}=await supabaseClient.auth.getUser();
  const payload={
   cliente_id:fichaClienteId,
   preferencias:g("ftPreferencias"),
   alergias_sensibilidades:g("ftAlergias"),
   produtos_utilizados:g("ftProdutos"),
   cabelo_quimicas:g("ftCabeloQuimicas"),
   cabelo_cor_tonalidade:g("ftCabeloCor"),
   cabelo_procedimentos:g("ftCabeloProcedimentos"),
   unhas_formato:g("ftUnhasFormato"),
   unhas_tecnica:g("ftUnhasTecnica"),
   unhas_observacoes:g("ftUnhasObs"),
   recomendacoes_proximo_atendimento:g("ftRecomendacoes"),
   atualizado_por:user?.id||null
  };
  const btn=e.submitter; if(btn){btn.disabled=true;btn.textContent="Salvando..."}
  const {error}=await supabaseClient.from("cliente_ficha_tecnica").upsert(payload,{onConflict:"cliente_id"});
  if(btn){btn.disabled=false;btn.textContent="Salvar ficha técnica"}
  if(error)return alert("Erro ao salvar ficha técnica: "+error.message);
  await carregarFichaTecnica(fichaClienteId);
  alert("Ficha técnica salva.");
 });
});


// ===== V1.9.3 - Navegação da ficha em abas =====
function selecionarFichaTab(nome){
 document.querySelectorAll(".ficha-tab").forEach(b=>b.classList.toggle("active",b.dataset.fichaTab===nome));
 document.querySelectorAll(".ficha-tab-panel").forEach(p=>p.classList.toggle("active",p.dataset.fichaPanel===nome));
 const body=document.querySelector(".ficha-tab-body"); if(body)body.scrollTop=0;
}
function selecionarTechTab(nome){
 document.querySelectorAll(".tech-subtab").forEach(b=>b.classList.toggle("active",b.dataset.techTab===nome));
 document.querySelectorAll(".tech-panel").forEach(p=>p.classList.toggle("active",p.dataset.techPanel===nome));
}
const _abrirFichaClienteV193=abrirFichaCliente;
abrirFichaCliente=async function(id){
 selecionarFichaTab("resumo");
 selecionarTechTab("geral");
 await _abrirFichaClienteV193(id);
};
window.abrirFichaCliente=abrirFichaCliente;

document.addEventListener("DOMContentLoaded",()=>{
 document.querySelectorAll(".ficha-tab").forEach(b=>b.addEventListener("click",()=>selecionarFichaTab(b.dataset.fichaTab)));
 document.querySelectorAll(".tech-subtab").forEach(b=>b.addEventListener("click",()=>selecionarTechTab(b.dataset.techTab)));
});
