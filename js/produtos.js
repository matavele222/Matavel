let sessao, produtos = [], categorias = [], config = {};

async function init() {
  sessao = window.Sessao.exigirAutenticacao(["ADMIN", "VENDEDOR"]);
  if (!sessao) return;
  await window.DB.abrirBaseDados();
  window.Layout.inicializarLayout(sessao, "produtos.html");
  window.Utils.configurarModais();
  const isAdmin = sessao.perfil === "ADMIN";
  if (isAdmin) document.getElementById("btnNovo").style.display = "inline-flex";
  else { document.getElementById("colAccoes").style.display = "none"; document.getElementById("subtitulo").textContent = "Consulta de produtos"; }
  document.getElementById("btnNovo").onclick = () => abrirForm();
  document.getElementById("pesquisa").oninput = renderTabela;
  document.getElementById("filtroCategoria").onchange = renderTabela;
  document.getElementById("filtroEstado").onchange = renderTabela;
  document.getElementById("formProduto").onsubmit = guardar;
  config = await window.Utils.obterConfiguracoes();
  await carregar();
}

async function carregar() {
  [produtos, categorias] = await Promise.all([
    window.DB.buscarTodos(window.DB.STORE_NAMES.produtos),
    window.DB.buscarTodos(window.DB.STORE_NAMES.categorias)
  ]);
  const catSel = document.getElementById("categoriaId");
  const filtroCat = document.getElementById("filtroCategoria");
  catSel.innerHTML = '<option value="">Sem categoria</option>' + categorias.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("");
  filtroCat.innerHTML = '<option value="">Todas as categorias</option>' + categorias.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("");
  renderTabela();
}

function renderTabela() {
  const q = document.getElementById("pesquisa").value.toLowerCase();
  const catFiltro = document.getElementById("filtroCategoria").value;
  const estadoFiltro = document.getElementById("filtroEstado").value;
  const catMap = Object.fromEntries(categorias.map((c) => [c.id, c.nome]));
  const isAdmin = sessao.perfil === "ADMIN";

  const filtrados = produtos.filter((p) => {
    const estadoStock = window.Utils.calcularEstadoStock(p.stock, p.stockMinimo);
    const matchQ = !q || p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q) || (p.marca || "").toLowerCase().includes(q) || (catMap[p.categoriaId] || "").toLowerCase().includes(q);
    const matchCat = !catFiltro || String(p.categoriaId) === catFiltro;
    const matchEst = !estadoFiltro || estadoStock === estadoFiltro;
    return matchQ && matchCat && matchEst;
  });

  document.getElementById("tabela").innerHTML = filtrados.length ? filtrados.map((p) => {
    const estStock = window.Utils.calcularEstadoStock(p.stock, p.stockMinimo);
    const estVal = window.Utils.calcularEstadoValidade(p.dataValidade, config);
    return `<tr>
      <td>${p.codigo}</td><td>${p.nome}</td><td>${catMap[p.categoriaId] || "-"}</td>
      <td>${window.Utils.formatarMoeda(p.precoVenda)}</td><td>${p.stock}</td>
      <td>${window.Utils.badgeEstadoStock(estStock)}</td>
      <td>${p.dataValidade ? window.Utils.badgeValidade(estVal) : "-"}</td>
      ${isAdmin ? `<td class="actions">
        <button class="btn btn-secondary btn-sm" onclick="editar(${p.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" onclick="eliminarProd(${p.id})"><i class="fa-solid fa-trash"></i></button>
      </td>` : ""}
    </tr>`;
  }).join("") : `<tr><td colspan="${isAdmin ? 8 : 7}" class="empty-state">Nenhum produto encontrado.</td></tr>`;
}

async function abrirForm(dados) {
  document.getElementById("modalTitulo").textContent = dados ? "Editar Produto" : "Adicionar Produto";
  document.getElementById("prodId").value = dados?.id || "";
  document.getElementById("codigo").value = dados?.codigo || "";
  document.getElementById("nome").value = dados?.nome || "";
  document.getElementById("categoriaId").value = dados?.categoriaId || "";
  document.getElementById("marca").value = dados?.marca || "";
  document.getElementById("unidade").value = dados?.unidade || "Unidade";
  document.getElementById("precoCompra").value = dados?.precoCompra || 0;
  document.getElementById("precoVenda").value = dados?.precoVenda || "";
  document.getElementById("stock").value = dados?.stock ?? 0;
  document.getElementById("stockMinimo").value = dados?.stockMinimo ?? 0;
  document.getElementById("dataValidade").value = dados?.dataValidade || "";
  document.getElementById("estado").value = dados?.estado || "ACTIVO";
  document.getElementById("descricao").value = dados?.descricao || "";
  document.getElementById("formMsg").textContent = "";
  window.Utils.abrirModal("modalForm");
}

async function editar(id) { const p = await window.DB.buscarPorId(window.DB.STORE_NAMES.produtos, id); if (p) abrirForm(p); }

async function guardar(e) {
  e.preventDefault();
  const msg = document.getElementById("formMsg");
  const id = document.getElementById("prodId").value;
  const nome = document.getElementById("nome").value.trim();
  let codigo = document.getElementById("codigo").value.trim();
  const precoVenda = Number(document.getElementById("precoVenda").value);
  const precoCompra = Number(document.getElementById("precoCompra").value);
  const stock = Number(document.getElementById("stock").value);
  const stockMinimo = Number(document.getElementById("stockMinimo").value);

  if (!nome || precoVenda < 0 || precoCompra < 0 || stock < 0 || stockMinimo < 0) {
    window.Utils.mostrarMensagem(msg, "❌ Verifique os campos obrigatórios e valores negativos.", "error"); return;
  }
  if (!codigo) codigo = await window.Utils.gerarCodigoProduto();
  const existentes = await window.DB.buscarTodos(window.DB.STORE_NAMES.produtos);
  if (existentes.some((p) => p.codigo === codigo && String(p.id) !== String(id))) {
    window.Utils.mostrarMensagem(msg, "❌ Código de produto duplicado.", "error"); return;
  }

  const dados = {
    codigo, nome,
    categoriaId: Number(document.getElementById("categoriaId").value) || null,
    marca: document.getElementById("marca").value.trim(),
    unidade: document.getElementById("unidade").value,
    precoCompra, precoVenda, stock, stockMinimo,
    dataValidade: document.getElementById("dataValidade").value,
    estado: document.getElementById("estado").value,
    descricao: document.getElementById("descricao").value.trim()
  };

  if (id) {
    const actual = await window.DB.buscarPorId(window.DB.STORE_NAMES.produtos, Number(id));
    await window.DB.actualizar(window.DB.STORE_NAMES.produtos, { ...actual, ...dados });
    await window.DB.registarHistorico(sessao.username, "EDICAO_PRODUTO", `Edição do produto ${nome}`);
    window.Utils.mostrarMensagem(document.getElementById("msg"), "✓ Produto actualizado com sucesso.", "success");
  } else {
    dados.dataCadastro = new Date().toISOString();
    await window.DB.adicionar(window.DB.STORE_NAMES.produtos, dados);
    await window.DB.registarHistorico(sessao.username, "CADASTRO_PRODUTO", `Cadastro do produto ${nome}`);
    window.Utils.mostrarMensagem(document.getElementById("msg"), "✓ Produto cadastrado com sucesso.", "success");
  }
  window.Utils.fecharModal("modalForm");
  await carregar();
}

async function eliminarProd(id) {
  if (!window.Utils.confirmarAccao("Tem a certeza que deseja eliminar este produto?")) return;
  const p = await window.DB.buscarPorId(window.DB.STORE_NAMES.produtos, id);
  await window.DB.eliminar(window.DB.STORE_NAMES.produtos, id);
  await window.DB.registarHistorico(sessao.username, "ELIMINACAO_PRODUTO", `Eliminação do produto ${p.nome}`);
  window.Utils.mostrarMensagem(document.getElementById("msg"), "✓ Produto eliminado.", "success");
  await carregar();
}

window.editar = editar; window.eliminarProd = eliminarProd;
window.addEventListener("DOMContentLoaded", init);
