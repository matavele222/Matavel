let sessao, fornecedores = [], produtos = [];

async function init() {
  sessao = window.Sessao.exigirAutenticacao(["ADMIN"]);
  if (!sessao) return;
  await window.DB.abrirBaseDados();
  window.Layout.inicializarLayout(sessao, "fornecedores.html");
  window.Utils.configurarModais();
  document.getElementById("btnNovo").onclick = () => abrirForm();
  document.getElementById("pesquisa").oninput = renderTabela;
  document.getElementById("formForn").onsubmit = guardar;
  await carregar();
}

async function carregar() {
  [fornecedores, produtos] = await Promise.all([
    window.DB.buscarTodos(window.DB.STORE_NAMES.fornecedores),
    window.DB.buscarTodos(window.DB.STORE_NAMES.produtos)
  ]);
  renderTabela();
}

function renderTabela() {
  const q = document.getElementById("pesquisa").value.toLowerCase();
  const filtrados = fornecedores.filter((f) => !q || f.nomeEmpresa.toLowerCase().includes(q) || (f.nomeContacto || "").toLowerCase().includes(q));
  document.getElementById("tabela").innerHTML = filtrados.length ? filtrados.map((f) => {
    const count = produtos.filter((p) => p.fornecedorId === f.id).length;
    return `<tr><td>${f.nomeEmpresa}</td><td>${f.nomeContacto || "-"}</td><td>${f.telefone || "-"}</td><td>${f.email || "-"}</td>
      <td><span class="badge badge-success">${f.estado}</span></td><td>${count}</td>
      <td class="actions"><button class="btn btn-secondary btn-sm" onclick="editar(${f.id})"><i class="fa-solid fa-pen"></i></button>
      <button class="btn btn-danger btn-sm" onclick="eliminarForn(${f.id})"><i class="fa-solid fa-trash"></i></button></td></tr>`;
  }).join("") : `<tr><td colspan="7" class="empty-state">Nenhum fornecedor.</td></tr>`;
}

function abrirForm(dados) {
  document.getElementById("modalTitulo").textContent = dados ? "Editar Fornecedor" : "Adicionar Fornecedor";
  document.getElementById("fornId").value = dados?.id || "";
  document.getElementById("nomeEmpresa").value = dados?.nomeEmpresa || "";
  document.getElementById("nomeContacto").value = dados?.nomeContacto || "";
  document.getElementById("telefone").value = dados?.telefone || "";
  document.getElementById("email").value = dados?.email || "";
  document.getElementById("endereco").value = dados?.endereco || "";
  document.getElementById("nuit").value = dados?.nuit || "";
  document.getElementById("estado").value = dados?.estado || "ACTIVO";
  document.getElementById("descricao").value = dados?.descricao || "";
  document.getElementById("formMsg").textContent = "";
  window.Utils.abrirModal("modalForm");
}

async function editar(id) { const f = await window.DB.buscarPorId(window.DB.STORE_NAMES.fornecedores, id); if (f) abrirForm(f); }

async function guardar(e) {
  e.preventDefault();
  const msg = document.getElementById("formMsg");
  const id = document.getElementById("fornId").value;
  const nomeEmpresa = document.getElementById("nomeEmpresa").value.trim();
  if (!nomeEmpresa) { window.Utils.mostrarMensagem(msg, "❌ Preencha o nome da empresa.", "error"); return; }
  const dados = {
    nomeEmpresa, nomeContacto: document.getElementById("nomeContacto").value.trim(),
    telefone: document.getElementById("telefone").value.trim(), email: document.getElementById("email").value.trim(),
    endereco: document.getElementById("endereco").value.trim(), nuit: document.getElementById("nuit").value.trim(),
    estado: document.getElementById("estado").value, descricao: document.getElementById("descricao").value.trim()
  };
  if (id) {
    const actual = await window.DB.buscarPorId(window.DB.STORE_NAMES.fornecedores, Number(id));
    await window.DB.actualizar(window.DB.STORE_NAMES.fornecedores, { ...actual, ...dados });
    window.Utils.mostrarMensagem(document.getElementById("msg"), "✓ Fornecedor actualizado.", "success");
  } else {
    await window.DB.adicionar(window.DB.STORE_NAMES.fornecedores, dados);
    window.Utils.mostrarMensagem(document.getElementById("msg"), "✓ Fornecedor cadastrado.", "success");
  }
  window.Utils.fecharModal("modalForm");
  await carregar();
}

async function eliminarForn(id) {
  if (!window.Utils.confirmarAccao("Eliminar este fornecedor?")) return;
  await window.DB.eliminar(window.DB.STORE_NAMES.fornecedores, id);
  window.Utils.mostrarMensagem(document.getElementById("msg"), "✓ Fornecedor eliminado.", "success");
  await carregar();
}

window.editar = editar; window.eliminarForn = eliminarForn;
window.addEventListener("DOMContentLoaded", init);
