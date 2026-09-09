document.addEventListener("DOMContentLoaded", async () => {
  if (SUPABASE_URL.includes("COLE_AQUI")) return;

  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const fimDia = new Date();
  fimDia.setHours(23, 59, 59, 999);

  const { data: agendamentos, error } = await supabaseClient
    .from("agendamentos")
    .select("*")
    .gte("inicio", inicioDia.toISOString())
    .lte("inicio", fimDia.toISOString())
    .neq("status", "cancelado");

  if (error) {
    console.error(error);
    return;
  }

  const lista = agendamentos || [];

  document.getElementById("agendamentosHoje").textContent = lista.length;

  const atendidos = lista.filter(item => item.status === "concluido").length;
  document.getElementById("clientesAtendidos").textContent = atendidos;

  const previsto = lista.reduce((total, item) => total + Number(item.valor_total || 0), 0);
  const recebido = lista.reduce((total, item) => total + Number(item.valor_pago || 0), 0);

  document.getElementById("faturamentoPrevisto").textContent =
    previsto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  document.getElementById("faturamentoRecebido").textContent =
    recebido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
});
