
function renderEspecialidades(valor){
 return String(valor||"").split(",").map(x=>x.trim()).filter(Boolean).map(x=>`<span class="specialty-chip">${esc(x)}</span>`).join("") || '<span class="muted">Não informada</span>';
}

let profissionaisCache = [];
let servicosCache = [];

const esc = v => String(v ?? "")
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;").replaceAll("'","&#039;");

const especialidadesPadrao = [
  "Cabeleireira",
  "Manicure",
  "Pedicure",
  "Nail Designer",
  "Alongamento de Unhas",
  "Design de Sobrancelhas",
  "Depilação",
  "Maquiagem",
  "Estética"
];

function limparEspecialidades() {
  document.querySelectorAll("#especialidadesProfissional input[type=checkbox]").forEach(c => c.checked = false);
  especialidadeOutraTexto.value = "";
  especialidadeOutraBox.hidden = true;
}

function obterEspecialidadesSelecionadas() {
  const valores = [...document.querySelectorAll("#especialidadesProfissional input[type=checkbox]:checked")]
    .map(c => c.value)
    .filter(v => v !== "__OUTRA__");

  if (especialidadeOutraCheck.checked) {
    const outra = especialidadeOutraTexto.value.trim();
    if (!outra) throw new Error("Digite a especialidade em 'Outra'.");
    valores.push(outra);
  }

  return [...new Set(valores)];
}

function preencherEspecialidades(especialidades = []) {
  limparEspecialidades();

  const lista = Array.isArray(especialidades) ? especialidades : [];

  lista.forEach(valor => {
    const checkbox = [...document.querySelectorAll("#especialidadesProfissional input[type=checkbox]")]
      .find(c => c.value === valor);

    if (checkbox) {
      checkbox.checked = true;
    } else if (valor) {
      especialidadeOutraCheck.checked = true;
      especialidadeOutraTexto.value = valor;
      especialidadeOutraBox.hidden = false;
    }
  });
}

function limparFormularioProfissional() {
  profissionalForm.reset();
  profissionalId.value = "";
  profissionalComissao.value = "0";
  profissionalEmail.value = "";
  acessoProfissionalStatus.textContent = "O convite será enviado ao cadastrar o profissional.";
  profissionalFormTitle.textContent = "Novo profissional";
  profissionalMessage.textContent = "";
  limparEspecialidades();

  document.querySelectorAll("#servicosProfissional input[type=checkbox]").forEach(c => c.checked = false);

  document.querySelectorAll(".schedule-row[data-dia]").forEach(row => {
    row.querySelector(".dia-ativo").checked = false;
    row.querySelector(".hora-inicio").value = "";
    row.querySelector(".hora-fim").value = "";
    row.querySelector(".intervalo-inicio").value = "";
    row.querySelector(".intervalo-fim").value = "";
  });
}

function renderServicosProfissional() {
  const c = document.getElementById("servicosProfissional");

  if (!servicosCache.length) {
    c.innerHTML = '<div class="empty-state">Nenhum serviço ativo cadastrado.</div>';
    return;
  }

  c.innerHTML = servicosCache.map(s => `
    <label class="check-card">
      <input type="checkbox" value="${s.id}">
      <span>
        <strong>${esc(s.nome)}</strong>
        <small>${esc(s.categoria || "")}</small>
      </span>
    </label>
  `).join("");
}

async function carregarServicos() {
  const { data, error } = await supabaseClient
    .from("servicos")
    .select("id,nome,categoria")
    .eq("ativo", true)
    .order("categoria")
    .order("nome");

  if (error) {
    console.error(error);
    return;
  }

  servicosCache = data || [];
  renderServicosProfissional();
}

function renderProfissionais() {
  if (!profissionaisCache.length) {
    profissionaisLista.innerHTML = '<div class="empty-state">Nenhum profissional cadastrado ainda.</div>';
    return;
  }

  profissionaisLista.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Telefone</th>
          <th>E-mail</th>
          <th>Acesso</th>
          <th>Especialidades</th>
          <th>Comissão</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${profissionaisCache.map(p => `
          <tr>
            <td>${esc(p.nome)}</td>
            <td>${esc(p.telefone)}</td>
            <td>${esc(p.email || "—")}</td>
            <td><span class="access-badge access-${esc(p.acesso_status||"nao_criado")}">${esc(({nao_criado:"Não criado",convite_enviado:"Convite enviado",ativo:"Ativo"}[p.acesso_status]||p.acesso_status||"Não criado"))}</span></td>
            <td>${esc((p.especialidades || []).join(", "))}</td>
            <td>${Number(p.percentual_comissao || 0).toFixed(2).replace(".", ",")}%</td>
            <td class="actions-cell">
              <button class="btn-small" onclick="editarProfissional('${p.id}')">Editar</button>
              ${p.acesso_status === "ativo"
                ? '<span class="access-ok">Acesso ativo</span>'
                : `<button class="btn-small access-action" onclick="criarAcessoProfissional('${p.id}')">${p.acesso_status === "convite_enviado" ? "Reenviar acesso" : "Criar acesso"}</button>`}
              <button class="btn-small danger" onclick="excluirProfissional('${p.id}')">Excluir</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}

async function carregarProfissionais() {
  const { data, error } = await supabaseClient
    .from("profissionais")
    .select("id,nome,telefone,email,especialidades,percentual_comissao,ativo,perfil_id,acesso_status")
    .eq("ativo", true)
    .order("nome");

  if (error) {
    console.error(error);
    return;
  }

  profissionaisCache = data || [];
  renderProfissionais();
}

async function carregarRelacionamentosProfissional(id) {
  document.querySelectorAll("#servicosProfissional input[type=checkbox]").forEach(c => c.checked = false);

  document.querySelectorAll(".schedule-row[data-dia]").forEach(row => {
    row.querySelector(".dia-ativo").checked = false;
    row.querySelector(".hora-inicio").value = "";
    row.querySelector(".hora-fim").value = "";
    row.querySelector(".intervalo-inicio").value = "";
    row.querySelector(".intervalo-fim").value = "";
  });

  const [{ data: vinculos }, { data: horarios }] = await Promise.all([
    supabaseClient
      .from("profissionais_servicos")
      .select("servico_id")
      .eq("profissional_id", id),

    supabaseClient
      .from("horarios_profissionais")
      .select("dia_semana,hora_inicio,hora_fim,intervalo_inicio,intervalo_fim,ativo")
      .eq("profissional_id", id)
  ]);

  (vinculos || []).forEach(v => {
    const cb = document.querySelector(`#servicosProfissional input[value="${v.servico_id}"]`);
    if (cb) cb.checked = true;
  });

  (horarios || []).forEach(h => {
    const row = document.querySelector(`.schedule-row[data-dia="${h.dia_semana}"]`);
    if (!row) return;

    row.querySelector(".dia-ativo").checked = !!h.ativo;
    row.querySelector(".hora-inicio").value = (h.hora_inicio || "").slice(0, 5);
    row.querySelector(".hora-fim").value = (h.hora_fim || "").slice(0, 5);
    row.querySelector(".intervalo-inicio").value = (h.intervalo_inicio || "").slice(0, 5);
    row.querySelector(".intervalo-fim").value = (h.intervalo_fim || "").slice(0, 5);
  });
}

window.editarProfissional = async id => {
  const p = profissionaisCache.find(x => x.id === id);
  if (!p) return;

  profissionalId.value = p.id;
  profissionalNome.value = p.nome || "";
  profissionalTelefone.value = p.telefone || "";
  profissionalEmail.value = p.email || "";
  acessoProfissionalStatus.textContent = p.acesso_status === "ativo" ? "Acesso ativo." : p.acesso_status === "convite_enviado" ? "Convite enviado. Você pode reenviar o acesso." : "Acesso ainda não criado.";
  profissionalComissao.value = p.percentual_comissao ?? 0;

  preencherEspecialidades(p.especialidades || []);

  profissionalFormTitle.textContent = "Editar profissional";

  await carregarRelacionamentosProfissional(id);
  profissionalFormPanel.scrollIntoView({ behavior: "smooth" });
};

window.criarAcessoProfissional = async id => {
  const p = profissionaisCache.find(x => x.id === id);
  if (!p) return;
  if (!p.email) {
    alert("Informe primeiro o e-mail de acesso. Clique em Editar, preencha o e-mail e salve.");
    await editarProfissional(id);
    profissionalEmail.focus();
    return;
  }
  const pergunta = p.acesso_status === "convite_enviado"
    ? `Reenviar o acesso para ${p.email}?`
    : `Criar o acesso de ${p.nome} e enviar o convite para ${p.email}?`;
  if (!confirm(pergunta)) return;
  try {
    const { data: sess } = await supabaseClient.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) throw new Error("Sessão expirada. Entre novamente.");
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/criar-acesso-profissional`, {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
      body:JSON.stringify({profissional_id:id})
    });
    const retorno = await resp.json().catch(()=>({}));
    if (!resp.ok) throw new Error(retorno.error || "Não foi possível criar o acesso.");
    alert("Convite de acesso enviado por e-mail com sucesso.");
    await carregarProfissionais();
    if (retorno.whatsapp_url && confirm("Deseja abrir o WhatsApp para enviar também o aviso de acesso?")) {
      window.open(retorno.whatsapp_url,"_blank","noopener");
    }
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao criar acesso.");
    await carregarProfissionais();
  }
};

window.excluirProfissional = async id => {
  const p = profissionaisCache.find(x => x.id === id);
  if (!p || !confirm(`Excluir ${p.nome} da equipe ativa?`)) return;

  const { error } = await supabaseClient
    .from("profissionais")
    .update({ ativo: false })
    .eq("id", id);

  if (error) {
    alert("Não foi possível excluir o profissional.");
    console.error(error);
    return;
  }

  limparFormularioProfissional();
  await carregarProfissionais();
};

function obterServicosSelecionados() {
  return [...document.querySelectorAll("#servicosProfissional input[type=checkbox]:checked")]
    .map(c => c.value);
}

function obterHorariosFormulario() {
  const horarios = [];

  document.querySelectorAll(".schedule-row[data-dia]").forEach(row => {
    if (!row.querySelector(".dia-ativo").checked) return;

    const inicio = row.querySelector(".hora-inicio").value;
    const fim = row.querySelector(".hora-fim").value;
    const intervaloInicio = row.querySelector(".intervalo-inicio").value || null;
    const intervaloFim = row.querySelector(".intervalo-fim").value || null;
    const dia = row.children[0].textContent;

    if (!inicio || !fim) throw new Error(`Preencha entrada e saída de ${dia}.`);
    if (fim <= inicio) throw new Error(`A saída deve ser maior que a entrada em ${dia}.`);

    if ((intervaloInicio && !intervaloFim) || (!intervaloInicio && intervaloFim)) {
      throw new Error(`Preencha os dois horários de intervalo em ${dia}.`);
    }

    if (intervaloInicio && intervaloFim && intervaloFim <= intervaloInicio) {
      throw new Error(`O fim do intervalo deve ser maior que o início em ${dia}.`);
    }

    horarios.push({
      dia_semana: Number(row.dataset.dia),
      hora_inicio: inicio,
      hora_fim: fim,
      intervalo_inicio: intervaloInicio,
      intervalo_fim: intervaloFim,
      ativo: true
    });
  });

  return horarios;
}

async function salvarRelacionamentos(idProfissional) {
  const servicos = obterServicosSelecionados();
  const horarios = obterHorariosFormulario();

  let r = await supabaseClient
    .from("profissionais_servicos")
    .delete()
    .eq("profissional_id", idProfissional);

  if (r.error) throw r.error;

  if (servicos.length) {
    r = await supabaseClient
      .from("profissionais_servicos")
      .insert(servicos.map(servico_id => ({
        profissional_id: idProfissional,
        servico_id
      })));

    if (r.error) throw r.error;
  }

  r = await supabaseClient
    .from("horarios_profissionais")
    .delete()
    .eq("profissional_id", idProfissional);

  if (r.error) throw r.error;

  if (horarios.length) {
    r = await supabaseClient
      .from("horarios_profissionais")
      .insert(horarios.map(h => ({
        profissional_id: idProfissional,
        ...h
      })));

    if (r.error) throw r.error;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  especialidadeOutraCheck.addEventListener("change", () => {
    especialidadeOutraBox.hidden = !especialidadeOutraCheck.checked;

    if (especialidadeOutraCheck.checked) {
      especialidadeOutraTexto.focus();
    } else {
      especialidadeOutraTexto.value = "";
    }
  });

  await carregarServicos();
  await carregarProfissionais();

  novoProfissionalBtn.onclick = () => {
    limparFormularioProfissional();
    profissionalFormPanel.scrollIntoView({ behavior: "smooth" });
  };

  cancelarProfissionalBtn.onclick = limparFormularioProfissional;

  profissionalForm.onsubmit = async e => {
    e.preventDefault();

    profissionalMessage.textContent = "Salvando...";
    profissionalMessage.className = "form-message";

    try {
      const id = profissionalId.value;
      const especialidades = obterEspecialidadesSelecionadas();

      if (!especialidades.length) {
        throw new Error("Marque pelo menos uma especialidade.");
      }

      const payload = {
        nome: profissionalNome.value.trim(),
        telefone: profissionalTelefone.value.trim() || null,
        email: profissionalEmail.value.trim().toLowerCase(),
        especialidades,
        percentual_comissao: Number(profissionalComissao.value || 0),
        ativo: true
      };

      let idSalvo = id;

      if (id) {
        const { error } = await supabaseClient
          .from("profissionais")
          .update(payload)
          .eq("id", id);

        if (error) throw error;
      } else {
        const { data, error } = await supabaseClient
          .from("profissionais")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        idSalvo = data.id;
      }

      await salvarRelacionamentos(idSalvo);

      profissionalMessage.textContent = id
        ? "Profissional atualizado com sucesso."
        : "Profissional cadastrado. Use “Criar acesso” na lista para enviar o convite.";

      profissionalMessage.className = "form-message success";

      setTimeout(async () => {
        limparFormularioProfissional();
        await carregarProfissionais();
      }, 500);

    } catch (err) {
      profissionalMessage.textContent = err.message || "Erro ao salvar profissional.";
      profissionalMessage.className = "form-message error";
      console.error(err);
    }
  };
});
