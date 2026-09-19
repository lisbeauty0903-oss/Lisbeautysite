const $=id=>document.getElementById(id),money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),safe=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const labels={agendado:"Agendado",confirmado:"Confirmado",em_atendimento:"Em atendimento",concluido:"Concluído",cancelado:"Cancelado",nao_compareceu:"Não compareceu"};
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
function defaults(a,b){let e=new Date(),s=new Date(e);s.setDate(1);$(a).value=ymd(s);$(b).value=ymd(e)}
function csv(name,rows){let text=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(";")).join("\r\n"),blob=new Blob(["\ufeff"+text],{type:"text/csv;charset=utf-8;"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}

let data=[],pros=[],serv=[],links=[],clients=[],repasses=[];
const baseCalc=x=>x.status==="concluido"?Math.max(0,Number(x.valor_total||0)-Number(x.desconto||0)):0;
const pct=x=>Number(pros.find(p=>p.id===x.profissional_id)?.percentual_comissao||0);
const commission=x=>baseCalc(x)*pct(x)/100;
async function load(){
 let i=$("relInicio").value,f=$("relFim").value,p=$("relProf").value;
 let q=supabaseClient.from("agendamentos").select("*").gte("inicio",new Date(i+"T00:00:00").toISOString()).lte("inicio",new Date(f+"T23:59:59").toISOString()).order("inicio");
 if(p)q=q.eq("profissional_id",p);
 let [a,pr,se,cl,rp]=await Promise.all([
  q,
  supabaseClient.from("profissionais").select("id,nome,percentual_comissao").eq("ativo",true),
  supabaseClient.from("servicos").select("id,nome"),
  supabaseClient.from("clientes").select("id,nome"),
  supabaseClient.from("repasses_profissionais").select("*").gte("data_pagamento",i).lte("data_pagamento",f).order("data_pagamento",{ascending:false})
 ]);
 if(a.error||pr.error||se.error||cl.error||rp.error)throw(a.error||pr.error||se.error||cl.error||rp.error);
 data=a.data||[];pros=pr.data||[];serv=se.data||[];clients=cl.data||[];repasses=(rp.data||[]).filter(x=>!p||x.profissional_id===p);
 $("relProf").innerHTML='<option value="">Todos</option>'+pros.map(x=>`<option value="${x.id}" ${x.id===p?"selected":""}>${safe(x.nome)}</option>`).join("");
 let ids=data.map(x=>x.id);links=[];
 if(ids.length){let r=await supabaseClient.from("agendamento_servicos").select("agendamento_id,servico_id").in("agendamento_id",ids);if(r.error)throw r.error;links=r.data||[]}
 let concl=data.filter(x=>x.status==="concluido"),fat=concl.reduce((t,x)=>t+baseCalc(x),0),rec=concl.reduce((t,x)=>t+Number(x.valor_pago||0),0),com=concl.reduce((t,x)=>t+commission(x),0);
 $("relTotal").textContent=data.length;$("relConcluidos").textContent=concl.length;$("relCancelados").textContent=data.filter(x=>x.status==="cancelado").length;$("relFaltas").textContent=data.filter(x=>x.status==="nao_compareceu").length;
 let pagos=repasses.reduce((t,x)=>t+Number(x.valor||0),0);
 $("relFaturado").textContent=money(fat);$("relRecebido").textContent=money(rec);$("relComissoes").textContent=money(com);$("relComissoesPagas").textContent=money(pagos);$("relComissoesPendentes").textContent=money(Math.max(0,com-pagos));$("relStudio").textContent=money(Math.max(0,fat-com));
 let proRows=pros.map(pro=>{let rr=concl.filter(x=>x.profissional_id===pro.id),b=rr.reduce((t,x)=>t+baseCalc(x),0),rv=rr.reduce((t,x)=>t+Number(x.valor_pago||0),0),pc=Number(pro.percentual_comissao||0),co=b*pc/100,pa=repasses.filter(x=>x.profissional_id===pro.id).reduce((t,x)=>t+Number(x.valor||0),0);return{nome:pro.nome,pct:pc,q:rr.length,b,r:rv,co,pa,pend:Math.max(0,co-pa),st:b-co}}).filter(x=>x.q>0||x.pa>0);
 $("relProfissionais").innerHTML=proRows.length?proRows.map(x=>`<tr><td>${safe(x.nome)}</td><td>${x.pct.toLocaleString("pt-BR")}%</td><td>${x.q}</td><td>${money(x.b)}</td><td>${money(x.r)}</td><td><strong>${money(x.co)}</strong></td><td>${money(x.pa)}</td><td><strong>${money(x.pend)}</strong></td><td>${money(x.st)}</td></tr>`).join(""):'<tr><td colspan="9">Sem movimentação no período.</td></tr>';
 let concludedIds=new Set(concl.map(x=>x.id)),sg={};links.filter(x=>concludedIds.has(x.agendamento_id)).forEach(x=>{let n=serv.find(s=>s.id===x.servico_id)?.nome||"Serviço";sg[n]=(sg[n]||0)+1});
 $("relServicos").innerHTML=Object.keys(sg).length?Object.entries(sg).sort((a,b)=>b[1]-a[1]).map(([n,q])=>`<div class="report-rank"><strong>${safe(n)}</strong><span>${q}</span></div>`).join(""):'<div class="empty-state">Sem serviços concluídos no período.</div>';
 let cn=id=>clients.find(c=>c.id===id)?.nome||"Cliente",pn=id=>pros.find(p=>p.id===id)?.nome||"Profissional";
 $("relDetalhes").innerHTML=data.length?data.map(x=>{let b=baseCalc(x),co=commission(x);return`<tr><td>${new Date(x.inicio).toLocaleString("pt-BR")}</td><td>${safe(cn(x.cliente_id))}</td><td>${safe(pn(x.profissional_id))}</td><td>${labels[x.status]||x.status}</td><td>${x.status==="concluido"?money(b):"—"}</td><td>${money(x.valor_pago)}</td><td>${x.status==="concluido"?pct(x).toLocaleString("pt-BR")+"%":"—"}</td><td>${x.status==="concluido"?money(co):"—"}</td><td>${x.status==="concluido"?money(b-co):"—"}</td></tr>`}).join(""):'<tr><td colspan="9">Sem dados no período.</td></tr>';
 let rpn=id=>pros.find(p=>p.id===id)?.nome||"Profissional";
 $("relHistoricoRepasses").innerHTML=repasses.length?repasses.map(x=>`<tr><td>${new Date(x.data_pagamento+"T12:00:00").toLocaleDateString("pt-BR")}</td><td>${safe(rpn(x.profissional_id))}</td><td><strong>${money(x.valor)}</strong></td><td>${safe(x.forma_pagamento||"—")}</td><td>${safe(x.observacoes||"—")}</td></tr>`).join(""):'<tr><td colspan="5">Nenhum repasse no período.</td></tr>';
}
function exportAll(){
 let concl=data.filter(x=>x.status==="concluido"),fat=concl.reduce((t,x)=>t+baseCalc(x),0),rec=concl.reduce((t,x)=>t+Number(x.valor_pago||0),0),com=concl.reduce((t,x)=>t+commission(x),0);
 let rows=[["RESUMO"],["Agendamentos",data.length],["Concluídos",concl.length],["Cancelados",data.filter(x=>x.status==="cancelado").length],["Não compareceu",data.filter(x=>x.status==="nao_compareceu").length],["Faturado concluído",fat.toFixed(2)],["Recebido",rec.toFixed(2)],["Comissões geradas",com.toFixed(2)],["Comissões pagas",repasses.reduce((t,x)=>t+Number(x.valor||0),0).toFixed(2)],["Comissões pendentes",Math.max(0,com-repasses.reduce((t,x)=>t+Number(x.valor||0),0)).toFixed(2)],["Líquido Studio",(fat-com).toFixed(2)],[],["DETALHAMENTO"],["Data","Cliente","Profissional","Status","Faturado","Recebido","% Comissão","Comissão","Líquido Studio"]];
 let cn=id=>clients.find(c=>c.id===id)?.nome||"",pn=id=>pros.find(p=>p.id===id)?.nome||"";
 data.forEach(x=>{let b=baseCalc(x),co=commission(x);rows.push([new Date(x.inicio).toLocaleString("pt-BR"),cn(x.cliente_id),pn(x.profissional_id),labels[x.status]||x.status,x.status==="concluido"?b.toFixed(2):"",Number(x.valor_pago||0).toFixed(2),x.status==="concluido"?pct(x).toFixed(2):"",x.status==="concluido"?co.toFixed(2):"",x.status==="concluido"?(b-co).toFixed(2):""])});
 csv("lis-beauty-relatorio-financeiro.csv",rows);
}
document.addEventListener("DOMContentLoaded",async()=>{try{defaults("relInicio","relFim");await load();$("relAplicar").onclick=load;$("exportRelatorio").onclick=exportAll}catch(e){console.error(e);alert("Erro ao carregar relatório: "+(e.message||""))}});
