const D=id=>document.getElementById(id),cur=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),safe=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const SL={agendado:"Agendado",confirmado:"Confirmado",em_atendimento:"Em atendimento",concluido:"Concluído",cancelado:"Cancelado",nao_compareceu:"Não compareceu"};
function start(d){let x=new Date(d);x.setHours(0,0,0,0);return x} function end(d){let x=new Date(d);x.setHours(23,59,59,999);return x}
const tm=x=>new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit"}).format(new Date(x));
const dh=x=>new Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(x));
async function loadDashboard(){
 const now=new Date(),s=start(now),e=end(now),e7=new Date(e);e7.setDate(e7.getDate()+7);
 D("dashboardData").textContent=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}).format(now);
 const [ar,cr,pr,sr]=await Promise.all([
  supabaseClient.from("agendamentos").select("id,cliente_id,profissional_id,inicio,fim,status,valor_total,desconto,valor_pago").gte("inicio",s.toISOString()).lte("inicio",e7.toISOString()).order("inicio"),
  supabaseClient.from("clientes").select("id,nome",{count:"exact"}).eq("ativo",true),
  supabaseClient.from("profissionais").select("id,nome",{count:"exact"}).eq("ativo",true),
  supabaseClient.from("servicos").select("id,nome",{count:"exact"}).eq("ativo",true)
 ]);
 for(const r of [ar,cr,pr,sr])if(r.error)throw r.error;
 const ag=ar.data||[],cl=cr.data||[],pf=pr.data||[],today=ag.filter(a=>new Date(a.inicio)>=s&&new Date(a.inicio)<=e),active=today.filter(a=>a.status!=="cancelado"),week=ag.filter(a=>a.status!=="cancelado");
 const predicted=active.reduce((t,a)=>t+Math.max(0,Number(a.valor_total||0)-Number(a.desconto||0)),0),received=active.reduce((t,a)=>t+Number(a.valor_pago||0),0);
 D("kpiHoje").textContent=active.length;D("kpiHojeDetalhe").textContent=active.length===1?"1 atendimento ativo":`${active.length} atendimentos ativos`;D("kpiSemana").textContent=week.length;D("kpiPrevisto").textContent=cur(predicted);D("kpiRecebido").textContent=cur(received);D("kpiRecebidoDetalhe").textContent=predicted?`${Math.round(received/predicted*100)}% do previsto`:"Sem valor previsto";
 D("totalClientes").textContent=cr.count??cl.length;D("totalProfissionais").textContent=pr.count??pf.length;D("totalServicos").textContent=sr.count??(sr.data||[]).length;D("totalConcluidos").textContent=today.filter(a=>a.status==="concluido").length;
 const cn=id=>cl.find(x=>x.id===id)?.nome||"Cliente",pn=id=>pf.find(x=>x.id===id)?.nome||"Profissional";
 D("agendaHojeLista").innerHTML=active.length?active.map(a=>`<div class="today-row"><div class="today-time">${tm(a.inicio)}</div><div class="today-info"><strong>${safe(cn(a.cliente_id))}</strong><span>${safe(pn(a.profissional_id))}</span></div><span class="status-pill status-${a.status}">${SL[a.status]||a.status}</span><strong class="today-value">${cur(Math.max(0,Number(a.valor_total||0)-Number(a.desconto||0)))}</strong></div>`).join(""):'<div class="empty-state">Nenhum atendimento programado para hoje.</div>';
 let counts={};today.forEach(a=>counts[a.status]=(counts[a.status]||0)+1);D("statusHoje").innerHTML=["agendado","confirmado","em_atendimento","concluido","nao_compareceu","cancelado"].map(x=>`<div class="status-summary-row"><span>${SL[x]}</span><strong>${counts[x]||0}</strong></div>`).join("");
 const next=ag.filter(a=>new Date(a.inicio)>e&&a.status!=="cancelado").slice(0,8);D("proximosLista").innerHTML=next.length?next.map(a=>`<div class="upcoming-row"><div><strong>${safe(cn(a.cliente_id))}</strong><span>${dh(a.inicio)} · ${safe(pn(a.profissional_id))}</span></div><span class="status-pill status-${a.status}">${SL[a.status]||a.status}</span></div>`).join(""):'<div class="empty-state">Nenhum próximo atendimento nos próximos 7 dias.</div>';
}
document.addEventListener("DOMContentLoaded",async()=>{try{await loadDashboard()}catch(e){console.error(e);D("agendaHojeLista").innerHTML=`<div class="empty-state">Erro ao carregar: ${safe(e.message||"")}</div>`}});
