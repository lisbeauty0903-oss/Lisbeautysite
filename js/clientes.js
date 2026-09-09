async function carregarClientes() {
  const container = document.getElementById("clientesLista");

  const { data, error } = await supabaseClient
    .from("clientes")
    .select("id,nome,telefone,email,data_nascimento,ativo")
    .order("nome");

  if (error) {
    container.innerHTML = `<div class="empty-state">Erro ao carregar clientes.</div>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state">Nenhum cliente cadastrado.</div>`;
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Telefone</th>
          <th>E-mail</th>
          <th>Nascimento</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(cliente => `
          <tr>
            <td>${cliente.nome || ""}</td>
            <td>${cliente.telefone || ""}</td>
            <td>${cliente.email || ""}</td>
            <td>${cliente.data_nascimento || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (SUPABASE_URL.includes("COLE_AQUI")) return;

  await carregarClientes();

  const form = document.getElementById("clienteForm");
  const message = document.getElementById("clienteMessage");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      nome: document.getElementById("clienteNome").value.trim(),
      telefone: document.getElementById("clienteTelefone").value.trim(),
      email: document.getElementById("clienteEmail").value.trim() || null,
      data_nascimento: document.getElementById("clienteNascimento").value || null,
      observacoes: document.getElementById("clienteObservacoes").value.trim() || null,
      ativo: true
    };

    const { error } = await supabaseClient.from("clientes").insert(payload);

    if (error) {
      message.textContent = error.message.includes("duplicate")
        ? "Este telefone já está cadastrado."
        : "Erro ao cadastrar cliente.";
      message.className = "form-message error";
      console.error(error);
      return;
    }

    message.textContent = "Cliente cadastrado com sucesso.";
    message.className = "form-message success";
    form.reset();
    await carregarClientes();
  });
});
