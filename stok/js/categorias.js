let sessao, categorias = [], produtos = [];

async function init() {
  sessao = window.Sessao.exigirAutenticacao(["ADMIN"]);
  if (!sessao) return;
  await window.DB.abrirBaseDados();
  window.Layout.inicializarLayout(sessao, "categorias.html");
  window.Utils.configurarModais();
  document.getElementById("btnNovo").onclick = () => abrirForm();
  document.getElementById("pesquisa").oninput = renderTabela;
  document.getElementById("formCat").onsubmit = guardar;
  await carregar();
}

async function carregar() {
  [categorias, produtos] = await Promise.all([
    window.DB.buscarTodos(window.DB.STORE_NAMES.categorias),
    window.DB.buscarTodos(window.DB.STORE_NAMES.produtos)
  ]);
  renderTabela();
}

function renderTabela() {
  const q = document.getElementById("pesquisa").value.toLowerCase();
  const filtrados = categorias.filter((c) => !q || c.nome.toLowerCase().includes(q));
  document.getElementById("tabela").innerHTML = filtrados.length ? filtrados.map((c) => {
    const count = produtos.filter((p) => p.categoriaId === c.id).length;
    return `<tr><td>${c.id}</td><td>${c.nome}</td><td><span class="badge badge-success">${c.estado}</span></td><td>${count}</td>
      <td class="actions"><button class="btn btn-secondary btn-sm" onclick="editar(${c.id})"><i class="fa-solid fa-pen"></i></button>
      <button class="btn btn-danger btn-sm" onclick="eliminarCat(${c.id})"><i class="fa-solid fa-trash"></i></button></td></tr>`;
  }).join("") : `<tr><td colspan="5" class="empty-state">Nenhuma categoria.</td></tr>`;
}

function abrirForm(dados) {
  document.getElementById("modalTitulo").textContent = dados ? "Editar Categoria" : "Adicionar Categoria";
  document.getElementById("catId").value = dados?.id || "";
  document.getElementById("nome").value = dados?.nome || "";
  document.getElementById("estado").value = dados?.estado || "ACTIVO";
  document.getElementById("formMsg").textContent = "";
  window.Utils.abrirModal("modalForm");
}

async function editar(id) { const c = await window.DB.buscarPorId(window.DB.STORE_NAMES.categorias, id); if (c) abrirForm(c); }

async function guardar(e) {
  e.preventDefault();
  const msg = document.getElementById("formMsg");
  const id = document.getElementById("catId").value;
  const nome = document.getElementById("nome").value.trim();
  const estado = document.getElementById("estado").value;
  if (!nome) { window.Utils.mostrarMensagem(msg, "❌ Preencha o nome.", "error"); return; }
  const existentes = await window.DB.buscarTodos(window.DB.STORE_NAMES.categorias);
  if (existentes.some((c) => c.nome.toLowerCase() === nome.toLowerCase() && String(c.id) !== String(id))) {
    window.Utils.mostrarMensagem(msg, "❌ Categoria já existe.", "error"); return;
  }
  if (id) {
    const actual = await window.DB.buscarPorId(window.DB.STORE_NAMES.categorias, Number(id));
    await window.DB.actualizar(window.DB.STORE_NAMES.categorias, { ...actual, nome, estado });
    window.Utils.mostrarMensagem(document.getElementById("msg"), "✓ Categoria actualizada.", "success");
  } else {
    await window.DB.adicionar(window.DB.STORE_NAMES.categorias, { nome, estado });
    window.Utils.mostrarMensagem(document.getElementById("msg"), "✓ Categoria cadastrada.", "success");
  }
  window.Utils.fecharModal("modalForm");
  await carregar();
}

async function eliminarCat(id) {
  const associados = produtos.filter((p) => p.categoriaId === id);
  if (associados.length) {
    const novaCat = prompt(`Esta categoria tem ${associados.length} produto(s). Indique o ID da categoria para transferir (ou cancele):`);
    if (!novaCat) return;
    const destino = Number(novaCat);
    if (!categorias.find((c) => c.id === destino)) { alert("Categoria de destino inválida."); return; }
    for (const p of associados) {
      p.categoriaId = destino;
      await window.DB.actualizar(window.DB.STORE_NAMES.produtos, p);
    }
  }
  if (!window.Utils.confirmarAccao("Confirmar eliminação da categoria?")) return;
  await window.DB.eliminar(window.DB.STORE_NAMES.categorias, id);
  window.Utils.mostrarMensagem(document.getElementById("msg"), "✓ Categoria eliminada.", "success");
  await carregar();
}

window.editar = editar; window.eliminarCat = eliminarCat;
window.addEventListener("DOMContentLoaded", init);
