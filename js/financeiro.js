const $=id=>document.getElementById(id),money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),safe=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const labels={agendado:"Agendado",confirmado:"Confirmado",em_atendimento:"Em atendimento",concluido:"Concluído",cancelado:"Cancelado",nao_compareceu:"Não compareceu"};
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
function defaults(a,b){let e=new Date(),s=new Date(e);s.setDate(1);$(a).value=ymd(s);$(b).value=ymd(e)}
function csv(name,rows){let text=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(";")).join("\r\n"),blob=new Blob(["\ufeff"+text],{type:"text/csv;charset=utf-8;"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}

let rows=[],clients=[],pros=[];
async function load(){
 let i=$("finInicio").value,f=$("finFim").value,p=$("finProf").value,st=$("finStatus").value;
 let q=supabaseClient.from("agendamentos").select("*").gte("inicio",new Date(i+"T00:00:00").toISOString()).lte("inicio",new Date(f+"T23:59:59").toISOString()).order("inicio");
 if(p)q=q.eq("profissional_id",p);if(st)q=q.eq("status",st);
 let [a,c,pr]=await Promise.all([q,supabaseClient.from("clientes").select("id,nome"),supabaseClient.from("profissionais").select("id,nome").eq("ativo",true)]);
 if(a.error||c.error||pr.error)throw(a.error||c.error||pr.error);rows=a.data||[];clients=c.data||[];pros=pr.data||[];
 $("finProf").innerHTML='<option value="">Todos</option>'+pros.map(x=>`<option value="${x.id}" ${x.id===p?"selected":""}>${safe(x.nome)}</option>`).join("");
 let valid=rows.filter(x=>x.status!=="cancelado"),prev=valid.reduce((t,x)=>t+Math.max(0,Number(x.valor_total||0)-Number(x.desconto||0)),0),rec=valid.reduce((t,x)=>t+Number(x.valor_pago||0),0);
 $("finPrevisto").textContent=money(prev);$("finRecebido").textContent=money(rec);$("finPendente").textContent=money(Math.max(0,prev-rec));$("finQtd").textContent=rows.length;
 let cn=id=>clients.find(x=>x.id===id)?.nome||"Cliente",pn=id=>pros.find(x=>x.id===id)?.nome||"Profissional";
 $("finTabela").innerHTML=rows.length?rows.map(x=>`<tr><td>${new Date(x.inicio).toLocaleString("pt-BR")}</td><td>${safe(cn(x.cliente_id))}</td><td>${safe(pn(x.profissional_id))}</td><td>${labels[x.status]||x.status}</td><td>${money(Math.max(0,Number(x.valor_total||0)-Number(x.desconto||0)))}</td><td>${money(x.valor_pago)}</td><td>${safe(x.forma_pagamento||"—")}</td></tr>`).join(""):'<tr><td colspan="7">Nenhum registro no período.</td></tr>';
 let pm={};valid.forEach(x=>{if(Number(x.valor_pago||0)>0){let k=x.forma_pagamento||"Não informado";pm[k]=(pm[k]||0)+Number(x.valor_pago)}});$("finPagamentos").innerHTML=Object.keys(pm).length?Object.entries(pm).map(([k,v])=>`<div class="status-summary-row"><span>${safe(k)}</span><strong>${money(v)}</strong></div>`).join(""):'<div class="empty-state">Nenhum pagamento registrado.</div>';
}
document.addEventListener("DOMContentLoaded",async()=>{defaults("finInicio","finFim");await load();$("finAplicar").onclick=load;$("exportFinanceiro").onclick=()=>csv("lis-beauty-financeiro.csv",[["Data","Cliente","Profissional","Status","Previsto","Recebido","Pagamento"],...rows.map(x=>[new Date(x.inicio).toLocaleString("pt-BR"),clients.find(c=>c.id===x.cliente_id)?.nome||"",pros.find(p=>p.id===x.profissional_id)?.nome||"",labels[x.status]||x.status,Math.max(0,Number(x.valor_total||0)-Number(x.desconto||0)).toFixed(2),Number(x.valor_pago||0).toFixed(2),x.forma_pagamento||""])])});
