let sessao, todos = [];

async function init() {
  sessao = window.Sessao.exigirAutenticacao(["ADMIN"]);
  if (!sessao) return;
  await window.DB.abrirBaseDados();
  window.Layout.inicializarLayout(sessao, "utilizadores.html");
  window.Utils.configurarModais();
  document.getElementById("btnNovo").onclick = () => abrirForm();
  document.getElementById("pesquisa").oninput = renderTabela;
  document.getElementById("formUtilizador").onsubmit = guardar;
  await carregar();
}

async function carregar() {
  todos = await window.DB.buscarTodos(window.DB.STORE_NAMES.utilizadores);
  renderTabela();
}

function renderTabela() {
  const q = document.getElementById("pesquisa").value.toLowerCase();
  const filtrados = todos.filter((u) =>
    u.perfil === "VENDEDOR" && (!q || u.nome.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
  );
  document.getElementById("tabela").innerHTML = filtrados.length ? filtrados.map((u) => `
    <tr>
      <td>${u.id}</td><td>${u.nome}</td><td>${u.username}</td><td>${u.perfil}</td>
      <td><span class="badge ${u.estado === "ACTIVO" ? "badge-success" : "badge-danger"}">${u.estado}</span></td>
      <td>${window.Utils.formatarData(u.dataCadastro)}</td>
      <td class="actions">
        <button class="btn btn-secondary btn-sm" onclick="editar(${u.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm ${u.estado === "ACTIVO" ? "btn-danger" : "btn-success"}" onclick="toggleEstado(${u.id})">${u.estado === "ACTIVO" ? "Desactivar" : "Activar"}</button>
        <button class="btn btn-danger btn-sm" onclick="eliminar(${u.id})"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join("") : `<tr><td colspan="7" class="empty-state">Nenhum vendedor encontrado.</td></tr>`;
}

function abrirForm(dados) {
  document.getElementById("modalTitulo").textContent = dados ? "Editar Vendedor" : "Adicionar Vendedor";
  document.getElementById("userId").value = dados?.id || "";
  document.getElementById("nome").value = dados?.nome || "";
  document.getElementById("username").value = dados?.username || "";
  document.getElementById("telefone").value = dados?.telefone || "";
  document.getElementById("password").value = "";
  document.getElementById("passwordConfirm").value = "";
  document.getElementById("perfil").value = "VENDEDOR";
  document.getElementById("estado").value = dados?.estado || "ACTIVO";
  document.getElementById("formMsg").textContent = "";
  window.Utils.abrirModal("modalForm");
}

async function editar(id) {
  const u = await window.DB.buscarPorId(window.DB.STORE_NAMES.utilizadores, id);
  if (u) abrirForm(u);
}

async function guardar(e) {
  e.preventDefault();
  const msg = document.getElementById("formMsg");
  const id = document.getElementById("userId").value;
  const nome = document.getElementById("nome").value.trim();
  const username = document.getElementById("username").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const password = document.getElementById("password").value;
  const passwordConfirm = document.getElementById("passwordConfirm").value;
  const estado = document.getElementById("estado").value;

  if (!nome || !username) { window.Utils.mostrarMensagem(msg, "❌ Preencha todos os campos obrigatórios.", "error"); return; }
  if (!id && (!password || password !== passwordConfirm)) { window.Utils.mostrarMensagem(msg, "❌ As palavras-passe não coincidem.", "error"); return; }
  if (id && password && password !== passwordConfirm) { window.Utils.mostrarMensagem(msg, "❌ As palavras-passe não coincidem.", "error"); return; }

  const existentes = await window.DB.buscarTodos(window.DB.STORE_NAMES.utilizadores);
  if (existentes.some((u) => u.username === username && String(u.id) !== String(id))) {
    window.Utils.mostrarMensagem(msg, "❌ Username já existe.", "error"); return;
  }

  const dados = { nome, username, telefone, perfil: "VENDEDOR", estado };
  if (password) dados.password = password;

  if (id) {
    const actual = await window.DB.buscarPorId(window.DB.STORE_NAMES.utilizadores, Number(id));
    await window.DB.actualizar(window.DB.STORE_NAMES.utilizadores, { ...actual, ...dados });
    await window.DB.registarHistorico(sessao.username, "EDICAO_VENDEDOR", `Edição do vendedor ${nome}`);
    window.Utils.mostrarMensagem(document.getElementById("msg"), "✓ Vendedor actualizado com sucesso.", "success");
  } else {
    dados.dataCadastro = new Date().toISOString();
    dados.password = password;
    await window.DB.adicionar(window.DB.STORE_NAMES.utilizadores, dados);
    await window.DB.registarHistorico(sessao.username, "CADASTRO_VENDEDOR", `Cadastro do vendedor ${nome}`);
    window.Utils.mostrarMensagem(document.getElementById("msg"), "✓ Vendedor cadastrado com sucesso.", "success");
  }
  window.Utils.fecharModal("modalForm");
  await carregar();
}

async function toggleEstado(id) {
  const u = await window.DB.buscarPorId(window.DB.STORE_NAMES.utilizadores, id);
  u.estado = u.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
  await window.DB.actualizar(window.DB.STORE_NAMES.utilizadores, u);
  await window.DB.registarHistorico(sessao.username, "DESACTIVACAO_VENDEDOR", `${u.estado === "ACTIVO" ? "Activação" : "Desactivação"} do vendedor ${u.nome}`);
  await carregar();
}

async function eliminar(id) {
  if (!window.Utils.confirmarAccao("Tem a certeza que deseja eliminar este vendedor?")) return;
  const u = await window.DB.buscarPorId(window.DB.STORE_NAMES.utilizadores, id);
  await window.DB.eliminar(window.DB.STORE_NAMES.utilizadores, id);
  await window.DB.registarHistorico(sessao.username, "ELIMINACAO_VENDEDOR", `Eliminação do vendedor ${u.nome}`);
  window.Utils.mostrarMensagem(document.getElementById("msg"), "✓ Vendedor eliminado.", "success");
  await carregar();
}

window.editar = editar; window.toggleEstado = toggleEstado; window.eliminar = eliminar;
window.addEventListener("DOMContentLoaded", init);
