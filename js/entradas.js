let sessao, entradas = [], produtos = [];

async function init() {
  sessao = window.Sessao.exigirAutenticacao(["ADMIN"]);
  if (!sessao) return;
  await window.DB.abrirBaseDados();
  window.Layout.inicializarLayout(sessao, "entradas.html");
  window.Utils.configurarModais();
  document.getElementById("btnNovo").onclick = () => { document.getElementById("dataEntrada").value = window.Utils.hojeISO(); window.Utils.abrirModal("modalForm"); };
  document.getElementById("formEntrada").onsubmit = guardar;
  document.getElementById("produtoId").onchange = () => {
    const p = produtos.find((x) => x.id === Number(document.getElementById("produtoId").value));
    if (p) document.getElementById("precoCompra").value = p.precoCompra || 0;
  };
  await carregar();
}

async function carregar() {
  [entradas, produtos] = await Promise.all([
    window.DB.buscarTodos(window.DB.STORE_NAMES.entradas),
    window.DB.buscarTodos(window.DB.STORE_NAMES.produtos)
  ]);
  document.getElementById("produtoId").innerHTML = produtos.map((p) => `<option value="${p.id}">${p.nome} (Stock: ${p.stock})</option>`).join("");
  renderTabela();
}

function renderTabela() {
  const prodMap = Object.fromEntries(produtos.map((p) => [p.id, p.nome]));
  const sorted = [...entradas].sort((a, b) => b.id - a.id);
  document.getElementById("tabela").innerHTML = sorted.length ? sorted.map((e) =>
    `<tr><td>${e.dataEntrada}</td><td>${prodMap[e.produtoId] || "-"}</td>
    <td>${e.quantidade}</td><td>${window.Utils.formatarMoeda(e.precoCompra)}</td><td>${e.numeroFactura || "-"}</td><td>${e.utilizador}</td></tr>`
  ).join("") : `<tr><td colspan="6" class="empty-state">Nenhuma entrada registada.</td></tr>`;
}

async function guardar(e) {
  e.preventDefault();
  const msg = document.getElementById("formMsg");
  const produtoId = Number(document.getElementById("produtoId").value);
  const quantidade = Number(document.getElementById("quantidade").value);
  const precoCompra = Number(document.getElementById("precoCompra").value);

  if (!produtoId || quantidade <= 0) { window.Utils.mostrarMensagem(msg, "❌ Quantidade inválida.", "error"); return; }

  const produto = await window.DB.buscarPorId(window.DB.STORE_NAMES.produtos, produtoId);
  const novoStock = Number(produto.stock) + quantidade;
  await window.DB.actualizar(window.DB.STORE_NAMES.produtos, { ...produto, stock: novoStock, precoCompra: precoCompra || produto.precoCompra });

  const entrada = {
    produtoId, quantidade, precoCompra,
    dataEntrada: document.getElementById("dataEntrada").value || window.Utils.hojeISO(),
    numeroFactura: document.getElementById("numeroFactura").value.trim(),
    observacao: document.getElementById("observacao").value.trim(),
    utilizador: sessao.username, utilizadorId: sessao.id
  };
  await window.DB.adicionar(window.DB.STORE_NAMES.entradas, entrada);
  await window.DB.registarHistorico(sessao.username, "ENTRADA_STOCK", `Entrada de ${quantidade} un. do produto ${produto.nome}`);
  window.Utils.mostrarMensagem(document.getElementById("msg"), `✓ Entrada registada. Novo stock: ${novoStock} unidades.`, "success");
  window.Utils.fecharModal("modalForm");
  document.getElementById("formEntrada").reset();
  await carregar();
}

window.addEventListener("DOMContentLoaded", init);
