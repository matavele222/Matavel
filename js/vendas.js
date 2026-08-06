let sessao, produtos = [], carrinho = [], prodSel = null, utilizadores = [], itensVenda = [];
const params = new URLSearchParams(window.location.search);
const modoMinhas = params.get("view") === "minhas";

async function init() {
  sessao = window.Sessao.exigirAutenticacao(["ADMIN", "VENDEDOR"]);
  if (!sessao) return;
  await window.DB.abrirBaseDados();
  window.Layout.inicializarLayout(sessao, "vendas.html");

  const isVendedor = sessao.perfil === "VENDEDOR";
  if (isVendedor && !modoMinhas) {
    document.getElementById("secVenda").style.display = "block";
    document.getElementById("pageTitle").textContent = "Nova Venda";
    document.getElementById("secLista").style.display = "none";
  } else if (isVendedor && modoMinhas) {
    document.getElementById("pageTitle").textContent = "Minhas Vendas";
  } else {
    document.getElementById("secVenda").style.display = "block";
    document.getElementById("pageTitle").textContent = "Vendas";
  }

  document.getElementById("pesquisaProd").oninput = renderProdutos;
  document.getElementById("btnAddCarrinho").onclick = addCarrinho;
  document.getElementById("btnConfirmar").onclick = confirmarVenda;
  document.getElementById("btnCalcularTroco").onclick = calcularTroco;
  document.getElementById("valorRecebido").oninput = calcularTroco;
  await carregar();
}

async function carregar() {
  [produtos, utilizadores, itensVenda] = await Promise.all([
    window.DB.buscarTodos(window.DB.STORE_NAMES.produtos),
    window.DB.buscarTodos(window.DB.STORE_NAMES.utilizadores),
    window.DB.buscarTodos(window.DB.STORE_NAMES.itensVenda)
  ]);
  renderProdutos();
  await renderVendas();
  await renderResumoLucros();
}

function estadoProduto(produtoId) {
  const noCarrinho = carrinho.find((c) => c.produtoId === produtoId);
  const seleccionado = prodSel?.id === produtoId;
  if (seleccionado && noCarrinho) return '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Seleccionado · No carrinho</span>';
  if (seleccionado) return '<span class="badge badge-info"><i class="fa-solid fa-hand-pointer"></i> Seleccionado</span>';
  if (noCarrinho) return '<span class="badge badge-warning"><i class="fa-solid fa-cart-shopping"></i> No carrinho</span>';
  return '<span class="badge" style="background:#f1f5f9;color:#94a3b8">—</span>';
}

function actualizarInfoSelecao() {
  const el = document.getElementById("prodSelecionadoInfo");
  if (!el) return;
  if (!prodSel) {
    el.textContent = "";
    el.className = "form-message";
    return;
  }
  const noCarrinho = carrinho.find((c) => c.produtoId === prodSel.id);
  el.className = "form-message success";
  el.innerHTML = noCarrinho
    ? `<i class="fa-solid fa-check-circle"></i> <strong>${prodSel.nome}</strong> seleccionado e já no carrinho (${noCarrinho.quantidade} un.)`
    : `<i class="fa-solid fa-hand-pointer"></i> <strong>${prodSel.nome}</strong> seleccionado — indique a quantidade e adicione ao carrinho`;
}

function renderProdutos() {
  const q = (document.getElementById("pesquisaProd")?.value || "").toLowerCase();
  const disp = produtos.filter((p) => p.estado === "ACTIVO" && Number(p.stock) > 0 && (!q || p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)));
  const el = document.getElementById("listaProdutos");
  if (!el) return;
  el.innerHTML = disp.length ? disp.map((p) => {
    const rowClass = prodSel?.id === p.id ? "produto-seleccionado" : carrinho.some((c) => c.produtoId === p.id) ? "produto-no-carrinho" : "";
    const btnClass = prodSel?.id === p.id ? "btn-success" : "btn-secondary";
    const btnText = prodSel?.id === p.id ? '<i class="fa-solid fa-check"></i> Seleccionado' : "Seleccionar";
    return `<tr class="${rowClass}">
      <td>${p.nome}</td><td>${window.Utils.formatarMoeda(p.precoVenda)}</td><td>${p.stock}</td>
      <td>${estadoProduto(p.id)}</td>
      <td><button class="btn ${btnClass} btn-sm" onclick="seleccionarProd(${p.id})">${btnText}</button></td></tr>`;
  }).join("") : `<tr><td colspan="5" class="empty-state">Nenhum produto disponível.</td></tr>`;
  actualizarInfoSelecao();
}

function seleccionarProd(id) {
  prodSel = produtos.find((p) => p.id === id);
  document.getElementById("prodSelecionado").value = id;
  document.getElementById("qtdAdd").max = prodSel.stock;
  renderProdutos();
}

function addCarrinho() {
  const msg = document.getElementById("msgVenda");
  if (!prodSel) { window.Utils.mostrarMensagem(msg, "⚠️ Seleccione um produto.", "warning"); return; }
  const qtd = Number(document.getElementById("qtdAdd").value);
  if (qtd <= 0) { window.Utils.mostrarMensagem(msg, "❌ Quantidade inválida.", "error"); return; }

  const existente = carrinho.find((c) => c.produtoId === prodSel.id);
  const qtdTotal = (existente?.quantidade || 0) + qtd;
  if (qtdTotal > Number(prodSel.stock)) {
    window.Utils.mostrarMensagem(msg, "⚠️ Stock insuficiente.", "warning"); return;
  }

  if (existente) {
    existente.quantidade = qtdTotal;
    existente.total = qtdTotal * existente.preco;
  } else {
    carrinho.push({ produtoId: prodSel.id, nome: prodSel.nome, quantidade: qtd, preco: Number(prodSel.precoVenda), total: qtd * Number(prodSel.precoVenda) });
  }
  renderCarrinho();
  renderProdutos();
  window.Utils.mostrarMensagem(msg, "✓ Produto adicionado ao carrinho.", "success");
}

function renderCarrinho() {
  const el = document.getElementById("carrinho");
  if (!el) return;
  el.innerHTML = carrinho.length ? carrinho.map((c, i) =>
    `<tr><td>${c.nome}</td><td><input type="number" min="1" value="${c.quantidade}" style="width:60px" onchange="alterarQtd(${i}, this.value)"></td>
    <td>${window.Utils.formatarMoeda(c.preco)}</td><td>${window.Utils.formatarMoeda(c.total)}</td>
    <td><button class="btn btn-danger btn-sm" onclick="removerItem(${i})"><i class="fa-solid fa-trash"></i></button></td></tr>`
  ).join("") : `<tr><td colspan="5" class="empty-state">Carrinho vazio.</td></tr>`;
  const total = carrinho.reduce((a, c) => a + c.total, 0);
  document.getElementById("totalCarrinho").textContent = window.Utils.formatarMoeda(total);
  calcularTroco();
  renderProdutos();
}

function calcularTroco() {
  const total = carrinho.reduce((a, c) => a + c.total, 0);
  const valorRecebidoEl = document.getElementById("valorRecebido");
  const trocoEl = document.getElementById("trocoCalculado");
  if (!valorRecebidoEl || !trocoEl) return;
  const valorRecebido = Number(valorRecebidoEl.value || 0);
  const troco = Math.max(0, valorRecebido - total);
  trocoEl.value = window.Utils.formatarMoeda(troco);
}

function alterarQtd(idx, val) {
  const qtd = Number(val);
  const item = carrinho[idx];
  const prod = produtos.find((p) => p.id === item.produtoId);
  if (qtd <= 0 || qtd > Number(prod.stock)) {
    window.Utils.mostrarMensagem(document.getElementById("msgVenda"), "⚠️ Stock insuficiente.", "warning");
    renderCarrinho(); return;
  }
  item.quantidade = qtd;
  item.total = qtd * item.preco;
  renderCarrinho();
}

function removerItem(idx) { carrinho.splice(idx, 1); renderCarrinho(); }

async function confirmarVenda() {
  const msg = document.getElementById("msgVenda");
  if (!carrinho.length) { window.Utils.mostrarMensagem(msg, "⚠️ Carrinho vazio.", "warning"); return; }

  for (const item of carrinho) {
    const prod = await window.DB.buscarPorId(window.DB.STORE_NAMES.produtos, item.produtoId);
    if (item.quantidade > Number(prod.stock)) {
      window.Utils.mostrarMensagem(msg, `⚠️ Stock insuficiente para ${prod.nome}.`, "warning"); return;
    }
  }

  const total = carrinho.reduce((a, c) => a + c.total, 0);
  const agora = new Date();
  const venda = {
    data: agora.toISOString().split("T")[0],
    hora: agora.toLocaleTimeString("pt-PT"),
    utilizadorId: sessao.id, utilizador: sessao.nome,
    total, metodoPagamento: document.getElementById("metodoPagamento").value,
    numeroRecibo: String((await window.DB.buscarTodos(window.DB.STORE_NAMES.vendas)).length + 1).padStart(6, "0")
  };
  const vendaId = await window.DB.adicionar(window.DB.STORE_NAMES.vendas, venda);

  for (const item of carrinho) {
    await window.DB.adicionar(window.DB.STORE_NAMES.itensVenda, { vendaId, produtoId: item.produtoId, quantidade: item.quantidade, preco: item.preco, total: item.total });
    const prod = await window.DB.buscarPorId(window.DB.STORE_NAMES.produtos, item.produtoId);
    const novoStock = Number(prod.stock) - item.quantidade;
    await window.DB.actualizar(window.DB.STORE_NAMES.produtos, { ...prod, stock: Math.max(0, novoStock) });
    await window.DB.registarHistorico(sessao.username, "VENDA", `Venda do produto ${prod.nome} (${item.quantidade} un.)`);
  }

  carrinho = [];
  prodSel = null;
  renderCarrinho();
  await carregar();
  window.Utils.mostrarMensagem(msg, "✓ Venda confirmada e guardada com sucesso.", "success");
}

function calcularLucroVenda(vendaId) {
  return itensVenda.filter((item) => item.vendaId === vendaId).reduce((total, item) => {
    const produto = produtos.find((p) => p.id === item.produtoId);
    if (!produto) return total;
    const precoCompra = Number(produto.precoCompra || 0);
    const precoVenda = Number(item.preco || produto.precoVenda || 0);
    return total + ((precoVenda - precoCompra) * Number(item.quantidade || 0));
  }, 0);
}

async function renderResumoLucros() {
  const vendas = await window.DB.buscarTodos(window.DB.STORE_NAMES.vendas);
  const vendasVisiveis = sessao.perfil === "VENDEDOR" || modoMinhas
    ? vendas.filter((v) => v.utilizadorId === sessao.id)
    : vendas;

  const totalVendido = vendasVisiveis.reduce((total, venda) => total + Number(venda.total || 0), 0);
  const lucroTotal = vendasVisiveis.reduce((total, venda) => total + calcularLucroVenda(venda.id), 0);
  const lucroMedio = vendasVisiveis.length ? lucroTotal / vendasVisiveis.length : 0;
  const ultimaVenda = vendasVisiveis.length ? `${vendasVisiveis[0].data} · ${vendasVisiveis[0].hora}` : "—";

  document.getElementById("resumoTotalVendas").textContent = window.Utils.formatarMoeda(totalVendido);
  document.getElementById("resumoLucroTotal").textContent = window.Utils.formatarMoeda(lucroTotal);
  document.getElementById("resumoLucroMedio").textContent = window.Utils.formatarMoeda(lucroMedio);
  document.getElementById("resumoUltimaVenda").textContent = ultimaVenda;
}

async function renderVendas() {
  const el = document.getElementById("tabelaVendas");
  if (!el) return;
  let vendas = await window.DB.buscarTodos(window.DB.STORE_NAMES.vendas);
  if (sessao.perfil === "VENDEDOR" || modoMinhas) vendas = vendas.filter((v) => v.utilizadorId === sessao.id);
  vendas = vendas.sort((a, b) => b.id - a.id);
  const userMap = Object.fromEntries(utilizadores.map((u) => [u.id, u.nome]));
  el.innerHTML = vendas.length ? vendas.map((v) => {
    const lucroVenda = calcularLucroVenda(v.id);
    return `<tr><td>${v.numeroRecibo || String(v.id).padStart(6, "0")}</td><td>${v.data}</td><td>${v.hora}</td>
    <td>${userMap[v.utilizadorId] || v.utilizador}</td><td>${window.Utils.formatarMoeda(v.total)}</td>
    <td>${window.Utils.formatarMoeda(lucroVenda)}</td><td>${v.metodoPagamento}</td></tr>`;
  }).join("") : `<tr><td colspan="7" class="empty-state">Nenhuma venda registada.</td></tr>`;
}

window.seleccionarProd = seleccionarProd;
window.alterarQtd = alterarQtd;
window.removerItem = removerItem;
window.addEventListener("DOMContentLoaded", init);
