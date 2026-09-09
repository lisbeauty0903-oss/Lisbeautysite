document.addEventListener("DOMContentLoaded", async () => {
  if (SUPABASE_URL.includes("COLE_AQUI")) return;

  const container = document.getElementById("servicosLista");

  const { data, error } = await supabaseClient
    .from("servicos")
    .select("nome,categoria,duracao_minutos,valor,tipo_preco,ativo")
    .eq("ativo", true)
    .order("categoria")
    .order("nome");

  if (error) {
    container.innerHTML = `<div class="empty-state">Erro ao carregar serviços.</div>`;
    console.error(error);
    return;
  }

  container.innerHTML = (data || []).map(servico => {
    const prefixo = servico.tipo_preco === "a_partir_de" ? "A partir de " : "";
    const preco = Number(servico.valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

    return `
      <article class="service-card">
        <span class="muted">${servico.categoria || "Serviço"}</span>
        <h3>${servico.nome}</h3>
        <div class="price">${prefixo}${preco}</div>
        <p class="muted">${servico.duracao_minutos} min</p>
      </article>
    `;
  }).join("");
});
