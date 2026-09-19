let C=[],P=[],S=[],V=[],H=[],A=[],B=[],ref=new Date(),view="semana";
const $=id=>document.getElementById(id), money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const ds=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const day=d=>{let x=new Date(d);x.setHours(0,0,0,0);return x}, week=d=>{let x=day(d),n=x.getDay();x.setDate(x.getDate()+(n===0?-6:1-n));return x};
const dt=(d,h)=>new Date(`${d}T${h}:00`), ov=(a,b,c,d)=>a<d&&b>c, hm=h=>{let[a,b]=h.slice(0,5).split(":").map(Number);return a*60+b}, mh=n=>`${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
const hora=x=>new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit"}).format(new Date(x));
const labels={agendado:"Agendado",confirmado:"Confirmado",em_atendimento:"Em atendimento",concluido:"Concluído",cancelado:"Cancelado",nao_compareceu:"Não compareceu"};
function range(){if(view==="dia")return[day(ref),new Date(day(ref).getTime()+86400000-1)];let s=week(ref),e=new Date(s);e.setDate(e.getDate()+7);return[s,new Date(e.getTime()-1)]}
function openP(id){$(id).hidden=false;$(id).scrollIntoView({behavior:"smooth"})} function closeP(id){$(id).hidden=true}
async function base(){
 let r=await Promise.all([
 supabaseClient.from("clientes").select("id,nome").eq("ativo",true).order("nome"),
 supabaseClient.from("profissionais").select("id,nome").eq("ativo",true).order("nome"),
 supabaseClient.from("servicos").select("id,nome,categoria,duracao_minutos,valor,tipo_preco").eq("ativo",true).order("nome"),
 supabaseClient.from("profissionais_servicos").select("profissional_id,servico_id,duracao_personalizada,valor_personalizado"),
 supabaseClient.from("horarios_profissionais").select("*").eq("ativo",true)]);
 if(r.some(x=>x.error))throw(r.find(x=>x.error).error);
 [C,P,S,V,H]=r.map(x=>x.data||[]);
 $("agendaCliente").innerHTML='<option value="">Selecione</option>'+C.map(x=>`<option value="${x.id}">${esc(x.nome)}</option>`).join("");
 let op='<option value="">Selecione</option>'+P.map(x=>`<option value="${x.id}">${esc(x.nome)}</option>`).join("");
 $("agendaProfissional").innerHTML=op;$("bloqueioProfissional").innerHTML=op;
 $("filtroProfissional").innerHTML='<option value="">Todos os profissionais</option>'+P.map(x=>`<option value="${x.id}">${esc(x.nome)}</option>`).join("");
}
async function events(){
 let [i,f]=range(),r=await Promise.all([
 supabaseClient.from("agendamentos").select("*").gte("inicio",i.toISOString()).lte("inicio",f.toISOString()).order("inicio"),
 supabaseClient.from("bloqueios_agenda").select("*").lt("inicio",f.toISOString()).gt("fim",i.toISOString()).order("inicio")]);
 if(r.some(x=>x.error))throw(r.find(x=>x.error).error);A=r[0].data||[];B=r[1].data||[];await render();
}
async function serviceMap(){
 let ids=A.map(x=>x.id);if(!ids.length)return{};
 let {data,error}=await supabaseClient.from("agendamento_servicos").select("agendamento_id,servico_id").in("agendamento_id",ids);if(error)throw error;
 let m={};(data||[]).forEach(x=>(m[x.agendamento_id]??=[]).push(x.servico_id));return m;
}
async function render(){
 let [i,f]=range(),pf=$("filtroProfissional").value,sf=$("filtroStatus")?.value||"",m=await serviceMap(),days=[];
 let visible=A.filter(x=>(!pf||x.profissional_id===pf)&&(!sf||x.status===sf));
 $("agendaKpiTotal").textContent=visible.filter(x=>x.status!=="cancelado").length;
 $("agendaKpiConfirmados").textContent=visible.filter(x=>x.status==="confirmado").length;
 $("agendaKpiAndamento").textContent=visible.filter(x=>x.status==="em_atendimento").length;
 $("agendaKpiConcluidos").textContent=visible.filter(x=>x.status==="concluido").length;
 $("periodoAgenda").textContent=view==="dia"?ref.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}):`${i.toLocaleDateString("pt-BR")} – ${f.toLocaleDateString("pt-BR")}`;
 if(view==="dia")days=[day(ref)];else{let s=week(ref);for(let n=0;n<7;n++){let d=new Date(s);d.setDate(d.getDate()+n);days.push(d)}}
 $("agendaGrid").innerHTML=`<div class="calendar-columns ${view==="dia"?"one-day":""}">${days.map(d=>{
  let k=ds(d),aa=A.filter(x=>ds(new Date(x.inicio))===k&&(!pf||x.profissional_id===pf)&&(!sf||x.status===sf)),bb=B.filter(x=>ds(new Date(x.inicio))===k&&(!pf||x.profissional_id===pf));
  let items=[...aa.map(x=>({t:"a",x})),...bb.map(x=>({t:"b",x}))].sort((u,v)=>new Date(u.x.inicio)-new Date(v.x.inicio));
  return `<div class="calendar-day ${k===ds(new Date())?"is-today":""}"><div class="calendar-day-head"><strong>${d.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})}</strong><button class="day-add" onclick="newDate('${k}')">+</button></div><div class="calendar-day-body">${items.length?items.map(z=>{
   if(z.t==="b"){let x=z.x,p=P.find(q=>q.id===x.profissional_id);return `<article class="agenda-item bloqueio-item"><div class="agenda-time">${hora(x.inicio)}–${hora(x.fim)}</div><strong>Bloqueado</strong><small>${esc(p?.nome||"")}</small><small>${esc(x.motivo||"Indisponível")}</small><button class="mini-link danger-text" onclick="delBlock('${x.id}')">Remover</button></article>`}
   let x=z.x,c=C.find(q=>q.id===x.cliente_id),p=P.find(q=>q.id===x.profissional_id),sn=(m[x.id]||[]).map(id=>S.find(s=>s.id===id)?.nome).filter(Boolean).join(", ");
   return `<article class="agenda-item status-${x.status}">
   <div class="agenda-card-main" onclick="editA('${x.id}')">
    <div class="agenda-time">${hora(x.inicio)}–${hora(x.fim)}</div>
    <strong>${esc(c?.nome||"Cliente")}</strong>
    <small class="agenda-prof-name">${esc(p?.nome||"")}</small>
    <small class="agenda-services-name">${esc(sn)}</small>
    <div class="agenda-card-meta"><span class="status-pill">${labels[x.status]||x.status}</span><span class="agenda-card-value">${money(Math.max(0,Number(x.valor_total||0)-Number(x.desconto||0)))}</span></div>
   </div>
   <div class="agenda-quick-actions">
    ${x.status==="agendado"?`<button onclick="event.stopPropagation();quickStatus('${x.id}','confirmado')">Confirmar</button>`:""}
    ${x.status==="confirmado"?`<button onclick="event.stopPropagation();quickStatus('${x.id}','em_atendimento')">Iniciar</button>`:""}
    ${x.status==="em_atendimento"?`<button onclick="event.stopPropagation();openFinish('${x.id}')">Concluir</button>`:""}
    ${!["concluido","cancelado"].includes(x.status)?`<button class="danger-text" onclick="event.stopPropagation();cancelA('${x.id}')">Cancelar</button>`:""}
   </div>
  </article>`}).join(""):'<div class="day-empty">Sem horários</div>'}</div></div>`}).join("")}</div>`;
}
function profServices(sel=[]){
 let pid=$("agendaProfissional").value;if(!pid){$("agendaServicos").innerHTML='<div class="empty-state">Escolha um profissional.</div>';return}
 let ids=V.filter(x=>x.profissional_id===pid).map(x=>x.servico_id),list=S.filter(x=>ids.includes(x.id));
 $("agendaServicos").innerHTML=list.length?list.map(s=>`<label class="check-card"><input type="checkbox" value="${s.id}" ${sel.includes(s.id)?"checked":""}><span><strong>${esc(s.nome)}</strong><small>${s.duracao_minutos} min · ${s.tipo_preco==="a_partir_de"?"A partir de ":""}${money(s.valor)}</small></span></label>`).join(""):'<div class="empty-state">Profissional sem serviços vinculados.</div>';
 $("agendaServicos").querySelectorAll("input").forEach(x=>x.onchange=slots);
}
function selected(){
 let pid=$("agendaProfissional").value,ids=[...$("agendaServicos").querySelectorAll("input:checked")].map(x=>x.value);
 return ids.map(id=>{let s=S.find(x=>x.id===id),v=V.find(x=>x.profissional_id===pid&&x.servico_id===id);return{...s,d:Number(v?.duracao_personalizada||s.duracao_minutos),val:Number(v?.valor_personalizado??s.valor)}})
}
function summary(){
 let x=selected(),dur=x.reduce((a,b)=>a+b.d,0),val=x.reduce((a,b)=>a+b.val,0),desc=Number($("agendaDesconto").value||0);
 $("agendaDuracao").value=`${dur} min`;$("agendaValorTotal").value=money(val);$("agendaTotalFinal").textContent=money(Math.max(0,val-desc));return{x,dur,val}
}
async function slots(pref=""){
 let pid=$("agendaProfissional").value,date=$("agendaData").value,{dur}=summary();$("agendaHorario").value="";if(!pid||!date||!dur){$("agendaHorario").innerHTML='<option value="">Selecione profissional, serviços e data</option>';$("agendaHorario").disabled=true;return}
 let dow=new Date(`${date}T12:00:00`).getDay(),h=H.find(x=>x.profissional_id===pid&&Number(x.dia_semana)===dow);
 if(!h){$("agendaHorario").innerHTML='<option value="">Profissional não trabalha nesta data</option>';$("agendaHorario").disabled=true;return}$("agendaHorario").disabled=false;
 let a=hm(h.hora_inicio),z=hm(h.hora_fim),bi=h.intervalo_inicio?hm(h.intervalo_inicio):null,bf=h.intervalo_fim?hm(h.intervalo_fim):null,current=$("agendamentoId").value;
 let aa=A.filter(x=>x.profissional_id===pid&&x.status!=="cancelado"&&x.id!==current&&ds(new Date(x.inicio))===date),bb=B.filter(x=>x.profissional_id===pid&&ds(new Date(x.inicio))===date),out=[];
 for(let n=a;n+dur<=z;n+=15){let e=n+dur;if(bi!==null&&ov(n,e,bi,bf))continue;let di=dt(date,mh(n)),df=dt(date,mh(e));if(!aa.some(x=>ov(di,df,new Date(x.inicio),new Date(x.fim)))&&!bb.some(x=>ov(di,df,new Date(x.inicio),new Date(x.fim))))out.push(mh(n))}
 $("agendaHorario").innerHTML=out.length?'<option value="">Selecione</option>'+out.map(x=>`<option value="${x}">${x}</option>`).join(""):'<option value="">Nenhum horário disponível</option>';$("agendaHorario").disabled=!out.length;if(pref&&out.includes(pref))$("agendaHorario").value=pref;
}
function clearA(){
 $("agendamentoForm").reset();$("agendamentoId").value="";$("agendamentoFormTitle").textContent="Novo agendamento";$("agendaStatus").value="agendado";$("agendaDesconto").value=0;$("agendaValorPago").value=0;$("agendaDuracao").value="0 min";$("agendaValorTotal").value="R$ 0,00";$("agendaTotalFinal").textContent="R$ 0,00";$("agendaServicos").innerHTML='<div class="empty-state">Escolha um profissional.</div>';$("agendaHorario").innerHTML='<option value="">Selecione profissional, serviços e data</option>';$("agendaHorario").value="";$("agendaHorario").disabled=true;$("agendamentoMessage").textContent="";
}
window.newDate=d=>{clearA();$("agendaData").value=d;openP("agendamentoPanel")};
window.editA=async id=>{let a=A.find(x=>x.id===id),r=await supabaseClient.from("agendamento_servicos").select("servico_id").eq("agendamento_id",id);if(r.error)return alert("Erro ao abrir agendamento.");
 $("agendamentoId").value=id;$("agendaCliente").value=a.cliente_id;$("agendaProfissional").value=a.profissional_id;$("agendaData").value=ds(new Date(a.inicio));$("agendaStatus").value=a.status;$("agendaDesconto").value=a.desconto||0;$("agendaValorPago").value=a.valor_pago||0;$("agendaFormaPagamento").value=a.forma_pagamento||"";$("agendaObservacoes").value=a.observacoes||"";$("agendamentoFormTitle").textContent="Editar agendamento";profServices((r.data||[]).map(x=>x.servico_id));summary();await slots(hora(a.inicio));openP("agendamentoPanel")};
async function saveA(e){e.preventDefault();try{let id=$("agendamentoId").value,cid=$("agendaCliente").value,pid=$("agendaProfissional").value,date=$("agendaData").value,time=$("agendaHorario").value,{x,dur,val}=summary();if(!cid||!pid||!date||!time)throw Error("Preencha cliente, profissional, data e horário.");if(!x.length)throw Error("Selecione pelo menos um serviço.");let ini=dt(date,time),fim=new Date(ini.getTime()+dur*60000),desc=Number($("agendaDesconto").value||0);if(desc>val)throw Error("Desconto maior que o valor dos serviços.");
 let payload={cliente_id:cid,profissional_id:pid,inicio:ini.toISOString(),fim:fim.toISOString(),status:$("agendaStatus").value,valor_total:val,desconto:desc,valor_pago:Number($("agendaValorPago").value||0),forma_pagamento:$("agendaFormaPagamento").value||null,observacoes:$("agendaObservacoes").value.trim()||null},r;
 if(id)r=await supabaseClient.from("agendamentos").update(payload).eq("id",id);else r=await supabaseClient.from("agendamentos").insert(payload).select("id").single();if(r.error)throw r.error;let aid=id||r.data.id;
 r=await supabaseClient.from("agendamento_servicos").delete().eq("agendamento_id",aid);if(r.error)throw r.error;r=await supabaseClient.from("agendamento_servicos").insert(x.map(s=>({agendamento_id:aid,servico_id:s.id,valor:s.val,duracao_minutos:s.d})));if(r.error)throw r.error;
 $("agendamentoMessage").textContent="Agendamento salvo com sucesso.";$("agendamentoMessage").className="form-message success";await events();setTimeout(()=>closeP("agendamentoPanel"),400)}catch(e){$("agendamentoMessage").textContent=e.message||"Erro ao salvar.";$("agendamentoMessage").className="form-message error"}}

window.quickStatus=async(id,status)=>{
 try{
  let r=await supabaseClient.from("agendamentos").update({status}).eq("id",id);
  if(r.error)throw r.error;
  await events();
 }catch(e){alert("Não foi possível atualizar o status: "+(e.message||"erro"))}
};
window.cancelA=async id=>{
 if(!confirm("Cancelar este agendamento? O horário será liberado."))return;
 try{
  let r=await supabaseClient.from("agendamentos").update({status:"cancelado"}).eq("id",id);
  if(r.error)throw r.error;
  await events();
 }catch(e){alert("Não foi possível cancelar: "+(e.message||"erro"))}
};
window.openFinish=async id=>{
 let a=A.find(x=>x.id===id); if(!a)return;
 let pago=prompt("Valor recebido neste atendimento:",String(Number(a.valor_pago||0).toFixed(2)).replace(".",","));
 if(pago===null)return;
 let valor=Number(String(pago).replace(",","."));
 if(Number.isNaN(valor)||valor<0){alert("Informe um valor válido.");return}
 let forma=prompt("Forma de pagamento (Pix, Dinheiro, Cartão de débito, Cartão de crédito ou Outro):",a.forma_pagamento||"Pix");
 if(forma===null)return;
 try{
  let r=await supabaseClient.from("agendamentos").update({status:"concluido",valor_pago:valor,forma_pagamento:forma.trim()||null}).eq("id",id);
  if(r.error)throw r.error;
  await events();
 }catch(e){alert("Não foi possível concluir: "+(e.message||"erro"))}
};

async function saveB(e){e.preventDefault();try{let pid=$("bloqueioProfissional").value,date=$("bloqueioData").value,a=$("bloqueioInicio").value,z=$("bloqueioFim").value;if(!pid||!date||!a||!z)throw Error("Preencha os campos.");if(z<=a)throw Error("O fim deve ser maior que o início.");let r=await supabaseClient.from("bloqueios_agenda").insert({profissional_id:pid,inicio:dt(date,a).toISOString(),fim:dt(date,z).toISOString(),motivo:$("bloqueioMotivo").value.trim()||null});if(r.error)throw r.error;$("bloqueioMessage").textContent="Bloqueio criado.";$("bloqueioMessage").className="form-message success";await events();setTimeout(()=>closeP("bloqueioPanel"),400)}catch(e){$("bloqueioMessage").textContent=e.message;$("bloqueioMessage").className="form-message error"}}
window.delBlock=async id=>{if(!confirm("Remover este bloqueio?"))return;let r=await supabaseClient.from("bloqueios_agenda").delete().eq("id",id);if(r.error)return alert("Erro ao remover.");await events()};
document.addEventListener("DOMContentLoaded",async()=>{try{await base();await events();$("novoAgendamentoBtn").onclick=()=>{clearA();$("agendaData").value=ds(new Date());openP("agendamentoPanel")};$("novoBloqueioBtn").onclick=()=>{$("bloqueioForm").reset();$("bloqueioData").value=ds(new Date());openP("bloqueioPanel")};$("cancelarAgendamentoBtn").onclick=()=>closeP("agendamentoPanel");$("cancelarBloqueioBtn").onclick=()=>closeP("bloqueioPanel");document.querySelectorAll("[data-close]").forEach(x=>x.onclick=()=>closeP(x.dataset.close));$("agendaProfissional").onchange=async()=>{profServices([]);$("agendaDuracao").value="0 min";$("agendaValorTotal").value="R$ 0,00";$("agendaTotalFinal").textContent=money(0);$("agendaHorario").value="";$("agendaHorario").disabled=true;await slots()};$("agendaData").onchange=async()=>{$("agendaHorario").value="";await slots()};$("agendaDesconto").oninput=summary;$("agendamentoForm").onsubmit=saveA;$("bloqueioForm").onsubmit=saveB;$("filtroProfissional").onchange=render;$("filtroStatus").onchange=render;
 $("irParaData").value=ds(ref);$("irParaData").onchange=async e=>{if(!e.target.value)return;ref=new Date(e.target.value+"T12:00:00");await events()};
 $("hojeBtn").onclick=async()=>{ref=new Date();$("irParaData").value=ds(ref);await events()};$("anteriorBtn").onclick=async()=>{ref.setDate(ref.getDate()+(view==="dia"?-1:-7));$("irParaData").value=ds(ref);await events()};$("proximoBtn").onclick=async()=>{ref.setDate(ref.getDate()+(view==="dia"?1:7));$("irParaData").value=ds(ref);await events()};$("visaoDiaBtn").onclick=async()=>{view="dia";$("visaoDiaBtn").classList.add("active-view");$("visaoSemanaBtn").classList.remove("active-view");await events()};$("visaoSemanaBtn").onclick=async()=>{view="semana";$("visaoSemanaBtn").classList.add("active-view");$("visaoDiaBtn").classList.remove("active-view");await events()}}catch(e){console.error(e);$("agendaGrid").innerHTML=`<div class="empty-state">Erro ao carregar agenda: ${esc(e.message)}</div>`}});
