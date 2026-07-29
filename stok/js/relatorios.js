let sessao, produtos = [], categorias = [], vendas = [], entradas = [], utilizadores = [], itensVenda = [], config = {};
let cache = {};

async function init() {
  sessao = window.Sessao.exigirAutenticacao(["ADMIN"]);
  if (!sessao) return;
  await window.DB.abrirBaseDados();
  window.Layout.inicializarLayout(sessao, "relatorios.html");
  config = await window.Utils.obterConfiguracoes();

  document.getElementById("btnFiltrar").onclick = renderRelatorios;
  document.getElementById("btnLimpar").onclick = limparFiltros;
  document.getElementById("btnExportar").onclick = exportarCSV;
  document.getElementById("btnPdf").onclick = exportarPDF;

  document.querySelectorAll(".report-tabs .btn").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".report-tabs .btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      document.querySelectorAll(".report-section").forEach((sec) => {
        if (tab === "todos") sec.classList.add("active");
        else sec.classList.toggle("active", sec.dataset.section === tab);
      });
    };
  });

  await carregar();
}

async function carregar() {
  [produtos, categorias, vendas, entradas, utilizadores, itensVenda] = await Promise.all([
    window.DB.buscarTodos(window.DB.STORE_NAMES.produtos),
    window.DB.buscarTodos(window.DB.STORE_NAMES.categorias),
    window.DB.buscarTodos(window.DB.STORE_NAMES.vendas),
    window.DB.buscarTodos(window.DB.STORE_NAMES.entradas),
    window.DB.buscarTodos(window.DB.STORE_NAMES.utilizadores),
    window.DB.buscarTodos(window.DB.STORE_NAMES.itensVenda)
  ]);

  document.getElementById("filtroProduto").innerHTML =
    '<option value="">Todos os produtos</option>' +
    produtos.map((p) => `<option value="${p.id}">${p.nome}</option>`).join("");
  document.getElementById("filtroCategoria").innerHTML =
    '<option value="">Todas as categorias</option>' +
    categorias.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("");
  document.getElementById("filtroVendedor").innerHTML =
    '<option value="">Todos os vendedores</option>' +
    utilizadores.filter((u) => u.perfil === "VENDEDOR" || u.perfil === "ADMIN")
      .map((u) => `<option value="${u.id}">${u.nome}</option>`).join("");

  renderRelatorios();
}

function limparFiltros() {
  document.getElementById("dataInicio").value = "";
  document.getElementById("dataFim").value = "";
  document.getElementById("filtroProduto").value = "";
  document.getElementById("filtroCategoria").value = "";
  document.getElementById("filtroVendedor").value = "";
  renderRelatorios();
}

function getFiltros() {
  return {
    inicio: document.getElementById("dataInicio").value,
    fim: document.getElementById("dataFim").value,
    produtoId: document.getElementById("filtroProduto").value,
    categoriaId: document.getElementById("filtroCategoria").value,
    vendedorId: document.getElementById("filtroVendedor").value
  };
}

function filtrarPorData(items, campo) {
  const { inicio, fim } = getFiltros();
  return items.filter((i) => {
    const d = String(i[campo] || "");
    if (!d) return !inicio && !fim;
    if (inicio && d < inicio) return false;
    if (fim && d > fim) return false;
    return true;
  });
}

function eHoje(data) {
  return data === window.Utils.hojeISO();
}

function eEstaSemana(data) {
  if (!data) return false;
  const d = new Date(data + "T00:00:00");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - hoje.getDay());
  return d >= inicio && d <= hoje;
}

function eEsteMes(data) {
  if (!data) return false;
  const d = new Date(data + "T00:00:00");
  const hoje = new Date();
  return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
}

function htmlTabela(linhas, colspan, vazio = "Sem dados.") {
  return linhas.length
    ? linhas.join("")
    : `<tr><td colspan="${colspan}" class="empty-state">${vazio}</td></tr>`;
}

function renderRelatorios() {
  const f = getFiltros();
  const catMap = Object.fromEntries(categorias.map((c) => [c.id, c.nome]));
  const userMap = Object.fromEntries(utilizadores.map((u) => [u.id, u.nome]));
  const prodMap = Object.fromEntries(produtos.map((p) => [p.id, p]));

  let prods = [...produtos];
  if (f.categoriaId) prods = prods.filter((p) => String(p.categoriaId) === f.categoriaId);
  if (f.produtoId) prods = prods.filter((p) => String(p.id) === f.produtoId);

  const stockBaixoList = prods.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= Number(p.stockMinimo || 0));
  const esgotadosList = prods.filter((p) => Number(p.stock) === 0);
  const valorStock = prods.reduce((a, p) => a + Number(p.stock) * Number(p.precoCompra || p.precoVenda || 0), 0);

  let vendasF = filtrarPorData(vendas, "data");
  if (f.vendedorId) vendasF = vendasF.filter((v) => String(v.utilizadorId) === f.vendedorId);

  const vendaIds = new Set(vendasF.map((v) => v.id));
  let itensF = itensVenda.filter((i) => vendaIds.has(i.vendaId));
  if (f.produtoId) itensF = itensF.filter((i) => String(i.produtoId) === f.produtoId);
  if (f.categoriaId) {
    itensF = itensF.filter((i) => String(prodMap[i.produtoId]?.categoriaId) === f.categoriaId);
  }

  // Se filtro de produto/categoria, restringir vendas às que têm esses itens
  if (f.produtoId || f.categoriaId) {
    const idsComItem = new Set(itensF.map((i) => i.vendaId));
    vendasF = vendasF.filter((v) => idsComItem.has(v.id));
  }

  const valorVendas = vendasF.reduce((a, v) => a + Number(v.total || 0), 0);
  let entradasF = filtrarPorData(entradas, "dataEntrada");
  if (f.produtoId) entradasF = entradasF.filter((e) => String(e.produtoId) === f.produtoId);
  if (f.categoriaId) {
    entradasF = entradasF.filter((e) => String(prodMap[e.produtoId]?.categoriaId) === f.categoriaId);
  }

  // Cards resumo
  document.getElementById("resumoCards").innerHTML = [
    ["Total Produtos", prods.length],
    ["Stock Actual", prods.reduce((a, p) => a + Number(p.stock || 0), 0)],
    ["Stock Baixo", stockBaixoList.length],
    ["Esgotados", esgotadosList.length],
    ["Valor Total Stock", window.Utils.formatarMoeda(valorStock)],
    ["Vendas do Dia", vendasF.filter((v) => eHoje(v.data)).length],
    ["Vendas Filtradas", vendasF.length],
    ["Valor Vendas", window.Utils.formatarMoeda(valorVendas)],
    ["Entradas", entradasF.length]
  ].map(([t, v]) => `<article class="card"><h4>${t}</h4><p>${v}</p></article>`).join("");

  // Stock actual
  document.getElementById("tabelaStock").innerHTML = htmlTabela(prods.map((p) => {
    const est = window.Utils.calcularEstadoStock(p.stock, p.stockMinimo);
    return `<tr>
      <td>${p.codigo || "-"}</td><td>${p.nome}</td><td>${catMap[p.categoriaId] || "-"}</td>
      <td>${p.stock}</td><td>${p.stockMinimo}</td>
      <td>${window.Utils.formatarMoeda(p.precoCompra)}</td>
      <td>${window.Utils.formatarMoeda(p.precoVenda)}</td>
      <td>${window.Utils.badgeEstadoStock(est)}</td>
      <td>${window.Utils.formatarMoeda(Number(p.stock) * Number(p.precoCompra || p.precoVenda || 0))}</td>
    </tr>`;
  }), 9);

  document.getElementById("tabelaStockBaixo").innerHTML = htmlTabela(
    stockBaixoList.map((p) => `<tr><td>${p.nome}</td><td>${p.stock}</td><td>${p.stockMinimo}</td></tr>`), 3, "Nenhum produto com stock baixo."
  );

  document.getElementById("tabelaEsgotados").innerHTML = htmlTabela(
    esgotadosList.map((p) => `<tr><td>${p.codigo || "-"}</td><td>${p.nome}</td><td>${catMap[p.categoriaId] || "-"}</td></tr>`), 3, "Nenhum produto esgotado."
  );

  // Por categoria
  const porCat = {};
  for (const p of prods) {
    const nome = catMap[p.categoriaId] || "Sem categoria";
    if (!porCat[nome]) porCat[nome] = { n: 0, stock: 0, valor: 0 };
    porCat[nome].n += 1;
    porCat[nome].stock += Number(p.stock || 0);
    porCat[nome].valor += Number(p.stock || 0) * Number(p.precoCompra || p.precoVenda || 0);
  }
  document.getElementById("tabelaPorCategoria").innerHTML = htmlTabela(
    Object.entries(porCat).map(([nome, d]) =>
      `<tr><td>${nome}</td><td>${d.n}</td><td>${d.stock}</td><td>${window.Utils.formatarMoeda(d.valor)}</td></tr>`
    ), 4
  );

  // Vendas
  const vendasOrdenadas = [...vendasF].sort((a, b) => String(b.data).localeCompare(String(a.data)) || b.id - a.id);
  document.getElementById("tabelaVendas").innerHTML = htmlTabela(vendasOrdenadas.map((v) =>
    `<tr>
      <td>${v.data}</td><td>${v.hora || "-"}</td><td>${v.numeroRecibo || String(v.id).padStart(6, "0")}</td>
      <td>${userMap[v.utilizadorId] || v.utilizador || "-"}</td>
      <td>${window.Utils.formatarMoeda(v.total)}</td><td>${v.metodoPagamento || "-"}</td>
    </tr>`
  ), 6);

  // Por vendedor
  const porVend = {};
  for (const v of vendasF) {
    const nome = userMap[v.utilizadorId] || v.utilizador || "Desconhecido";
    if (!porVend[nome]) porVend[nome] = { n: 0, total: 0 };
    porVend[nome].n += 1;
    porVend[nome].total += Number(v.total || 0);
  }
  document.getElementById("tabelaPorVendedor").innerHTML = htmlTabela(
    Object.entries(porVend).map(([nome, d]) =>
      `<tr><td>${nome}</td><td>${d.n}</td><td>${window.Utils.formatarMoeda(d.total)}</td></tr>`
    ), 3
  );

  // Por pagamento
  const porPag = {};
  for (const v of vendasF) {
    const m = v.metodoPagamento || "Outro";
    if (!porPag[m]) porPag[m] = { n: 0, total: 0 };
    porPag[m].n += 1;
    porPag[m].total += Number(v.total || 0);
  }
  document.getElementById("tabelaPorPagamento").innerHTML = htmlTabela(
    Object.entries(porPag).map(([m, d]) =>
      `<tr><td>${m}</td><td>${d.n}</td><td>${window.Utils.formatarMoeda(d.total)}</td></tr>`
    ), 3
  );

  // Vendas por produto
  const porProd = {};
  for (const it of itensF) {
    const nome = prodMap[it.produtoId]?.nome || "Produto eliminado";
    if (!porProd[nome]) porProd[nome] = { qtd: 0, total: 0 };
    porProd[nome].qtd += Number(it.quantidade || 0);
    porProd[nome].total += Number(it.total || 0);
  }
  document.getElementById("tabelaVendasProduto").innerHTML = htmlTabela(
    Object.entries(porProd).sort((a, b) => b[1].qtd - a[1].qtd).map(([nome, d]) =>
      `<tr><td>${nome}</td><td>${d.qtd}</td><td>${window.Utils.formatarMoeda(d.total)}</td></tr>`
    ), 3
  );

  // Vendas por categoria
  const porCatVenda = {};
  for (const it of itensF) {
    const prod = prodMap[it.produtoId];
    const nome = catMap[prod?.categoriaId] || "Sem categoria";
    if (!porCatVenda[nome]) porCatVenda[nome] = { qtd: 0, total: 0 };
    porCatVenda[nome].qtd += Number(it.quantidade || 0);
    porCatVenda[nome].total += Number(it.total || 0);
  }
  document.getElementById("tabelaVendasCategoria").innerHTML = htmlTabela(
    Object.entries(porCatVenda).map(([nome, d]) =>
      `<tr><td>${nome}</td><td>${d.qtd}</td><td>${window.Utils.formatarMoeda(d.total)}</td></tr>`
    ), 3
  );

  // Temporal: dia / semana / mês
  const dia = vendasF.filter((v) => eHoje(v.data));
  const semana = vendasF.filter((v) => eEstaSemana(v.data));
  const mes = vendasF.filter((v) => eEsteMes(v.data));
  document.getElementById("tabelaTemporal").innerHTML = `
    <tr><td>Vendas do Dia</td><td>${dia.length}</td><td>${window.Utils.formatarMoeda(dia.reduce((a, v) => a + Number(v.total || 0), 0))}</td></tr>
    <tr><td>Vendas da Semana</td><td>${semana.length}</td><td>${window.Utils.formatarMoeda(semana.reduce((a, v) => a + Number(v.total || 0), 0))}</td></tr>
    <tr><td>Vendas do Mês</td><td>${mes.length}</td><td>${window.Utils.formatarMoeda(mes.reduce((a, v) => a + Number(v.total || 0), 0))}</td></tr>
    <tr><td>Total Filtrado</td><td>${vendasF.length}</td><td>${window.Utils.formatarMoeda(valorVendas)}</td></tr>`;

  // Itens detalhados
  document.getElementById("tabelaItensVenda").innerHTML = htmlTabela(
    itensF.map((it) => {
      const venda = vendasF.find((v) => v.id === it.vendaId);
      const prod = prodMap[it.produtoId];
      return `<tr>
        <td>${venda?.data || "-"}</td><td>${prod?.nome || "-"}</td><td>${it.quantidade}</td>
        <td>${window.Utils.formatarMoeda(it.preco)}</td><td>${window.Utils.formatarMoeda(it.total)}</td>
        <td>${userMap[venda?.utilizadorId] || venda?.utilizador || "-"}</td>
      </tr>`;
    }), 6
  );

  // Entradas
  document.getElementById("tabelaEntradas").innerHTML = htmlTabela(
    [...entradasF].sort((a, b) => String(b.dataEntrada).localeCompare(String(a.dataEntrada)) || b.id - a.id).map((e) => {
      const prod = prodMap[e.produtoId];
      return `<tr>
        <td>${e.dataEntrada}</td><td>${prod?.nome || "-"}</td><td>${e.quantidade}</td>
        <td>${window.Utils.formatarMoeda(e.precoCompra)}</td>
        <td>${e.numeroFactura || "-"}</td><td>${e.utilizador || "-"}</td>
      </tr>`;
    }), 6
  );

  // Produtos recebidos
  const recebidos = {};
  for (const e of entradasF) {
    const nome = prodMap[e.produtoId]?.nome || "Produto eliminado";
    if (!recebidos[nome]) recebidos[nome] = { qtd: 0, n: 0, valor: 0 };
    recebidos[nome].qtd += Number(e.quantidade || 0);
    recebidos[nome].n += 1;
    recebidos[nome].valor += Number(e.quantidade || 0) * Number(e.precoCompra || 0);
  }
  document.getElementById("tabelaProdutosRecebidos").innerHTML = htmlTabela(
    Object.entries(recebidos).map(([nome, d]) =>
      `<tr><td>${nome}</td><td>${d.qtd}</td><td>${d.n}</td><td>${window.Utils.formatarMoeda(d.valor)}</td></tr>`
    ), 4
  );

  // Guardar cache para PDF/CSV
  cache = {
    prods, stockBaixoList, esgotadosList, porCat, vendasOrdenadas, porVend, porPag,
    porProd, porCatVenda, dia, semana, mes, valorVendas, valorStock, itensF, entradasF, recebidos,
    catMap, userMap, prodMap, f
  };
}

function textoFiltros() {
  const f = cache.f || getFiltros();
  const partes = [];
  if (f.inicio) partes.push(`De: ${f.inicio}`);
  if (f.fim) partes.push(`Até: ${f.fim}`);
  if (f.produtoId) {
    const p = produtos.find((x) => String(x.id) === f.produtoId);
    partes.push(`Produto: ${p?.nome || f.produtoId}`);
  }
  if (f.categoriaId) {
    const c = categorias.find((x) => String(x.id) === f.categoriaId);
    partes.push(`Categoria: ${c?.nome || f.categoriaId}`);
  }
  if (f.vendedorId) {
    const u = utilizadores.find((x) => String(x.id) === f.vendedorId);
    partes.push(`Vendedor: ${u?.nome || f.vendedorId}`);
  }
  return partes.length ? partes.join(" | ") : "Sem filtros (todos os dados)";
}

function exportarCSV() {
  renderRelatorios();
  const linhas = [
    ["RELATÓRIO COMPLETO - " + (config.nomeMercearia || "Mercearia")],
    [textoFiltros()],
    [],
    ["=== STOCK ==="],
    ["Código", "Produto", "Categoria", "Stock", "Mínimo", "Preço Compra", "Preço Venda", "Estado", "Valor Stock"]
  ];
  for (const p of cache.prods || []) {
    linhas.push([
      p.codigo, p.nome, cache.catMap[p.categoriaId] || "-", p.stock, p.stockMinimo,
      p.precoCompra, p.precoVenda, window.Utils.calcularEstadoStock(p.stock, p.stockMinimo),
      Number(p.stock) * Number(p.precoCompra || p.precoVenda || 0)
    ]);
  }
  linhas.push([], ["=== VENDAS ==="], ["Data", "Hora", "Recibo", "Vendedor", "Total", "Pagamento"]);
  for (const v of cache.vendasOrdenadas || []) {
    linhas.push([
      v.data, v.hora, v.numeroRecibo || v.id,
      cache.userMap[v.utilizadorId] || v.utilizador, v.total, v.metodoPagamento
    ]);
  }
  linhas.push([], ["=== ENTRADAS ==="], ["Data", "Produto", "Qtd", "Preço Compra", "Factura", "Utilizador"]);
  for (const e of cache.entradasF || []) {
    linhas.push([
      e.dataEntrada, cache.prodMap[e.produtoId]?.nome || "-", e.quantidade,
      e.precoCompra, e.numeroFactura || "-", e.utilizador || "-"
    ]);
  }
  window.Utils.exportarCSV(`relatorio_${window.Utils.hojeISO()}.csv`, linhas);
}

function exportarPDF() {
  renderRelatorios();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margem = 14;
  let y = 16;

  const titulo = config.nomeMercearia || "Mercearia";
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, margem, y);
  y += 7;
  doc.setFontSize(12);
  doc.text("Relatório de Gestão de Stock", margem, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-PT")}`, margem, y);
  y += 5;
  doc.text(textoFiltros(), margem, y, { maxWidth: 180 });
  y += 8;

  // Resumo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumo", margem, y);
  y += 2;
  doc.autoTable({
    startY: y,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total Produtos", String((cache.prods || []).length)],
      ["Stock Baixo", String((cache.stockBaixoList || []).length)],
      ["Esgotados", String((cache.esgotadosList || []).length)],
      ["Valor Total Stock", window.Utils.formatarMoeda(cache.valorStock || 0)],
      ["Vendas do Dia", String((cache.dia || []).length)],
      ["Vendas da Semana", String((cache.semana || []).length)],
      ["Vendas do Mês", String((cache.mes || []).length)],
      ["Vendas Filtradas", String((cache.vendasOrdenadas || []).length)],
      ["Valor Vendas", window.Utils.formatarMoeda(cache.valorVendas || 0)],
      ["Entradas", String((cache.entradasF || []).length)]
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: margem, right: margem }
  });

  // Stock
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Código", "Produto", "Categoria", "Stock", "Mín.", "Estado", "Valor"]],
    body: (cache.prods || []).map((p) => [
      p.codigo || "-",
      p.nome,
      cache.catMap[p.categoriaId] || "-",
      String(p.stock),
      String(p.stockMinimo),
      window.Utils.calcularEstadoStock(p.stock, p.stockMinimo),
      window.Utils.formatarMoeda(Number(p.stock) * Number(p.precoCompra || p.precoVenda || 0))
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: margem, right: margem },
    didDrawPage: (data) => {
      if (data.pageNumber === 1 && data.cursor.y < 40) return;
    }
  });

  // Adicionar título da secção stock
  // Vendas
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Data", "Hora", "Recibo", "Vendedor", "Total", "Pagamento"]],
    body: (cache.vendasOrdenadas || []).map((v) => [
      v.data || "-",
      v.hora || "-",
      v.numeroRecibo || String(v.id).padStart(6, "0"),
      cache.userMap[v.utilizadorId] || v.utilizador || "-",
      window.Utils.formatarMoeda(v.total),
      v.metodoPagamento || "-"
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [5, 150, 105] },
    margin: { left: margem, right: margem }
  });

  // Vendas por produto
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Produto", "Qtd Vendida", "Total"]],
    body: Object.entries(cache.porProd || {}).sort((a, b) => b[1].qtd - a[1].qtd).map(([nome, d]) => [
      nome, String(d.qtd), window.Utils.formatarMoeda(d.total)
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [5, 150, 105] },
    margin: { left: margem, right: margem }
  });

  // Por vendedor
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Vendedor", "Nº Vendas", "Total"]],
    body: Object.entries(cache.porVend || {}).map(([nome, d]) => [
      nome, String(d.n), window.Utils.formatarMoeda(d.total)
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [5, 150, 105] },
    margin: { left: margem, right: margem }
  });

  // Por pagamento
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Método Pagamento", "Nº Vendas", "Total"]],
    body: Object.entries(cache.porPag || {}).map(([m, d]) => [
      m, String(d.n), window.Utils.formatarMoeda(d.total)
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [217, 119, 6] },
    margin: { left: margem, right: margem }
  });

  // Entradas
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Data", "Produto", "Qtd", "Preço Compra", "Factura", "Utilizador"]],
    body: (cache.entradasF || []).map((e) => [
      e.dataEntrada || "-",
      cache.prodMap[e.produtoId]?.nome || "-",
      String(e.quantidade),
      window.Utils.formatarMoeda(e.precoCompra),
      e.numeroFactura || "-",
      e.utilizador || "-"
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [124, 58, 237] },
    margin: { left: margem, right: margem }
  });

  // Rodapé em todas as páginas
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Página ${i} de ${totalPages}`, 105, 290, { align: "center" });
  }

  doc.save(`relatorio_${window.Utils.hojeISO()}.pdf`);
}

window.addEventListener("DOMContentLoaded", init);
