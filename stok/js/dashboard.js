async function carregarDashboard() {
  const sessao = window.Sessao.exigirAutenticacao(["ADMIN", "VENDEDOR"]);
  if (!sessao) return;
  window.Layout.inicializarLayout(sessao, "dashboard.html");

  const isAdmin = sessao.perfil === "ADMIN";
  document.getElementById("dashboardTitle").textContent = isAdmin ? "Dashboard Administrativo" : "Dashboard do Vendedor";
  document.getElementById("welcomeText").textContent = `Bem-vindo, ${sessao.nome}`;

  const [produtos, vendas, utilizadores, itens, categorias] = await Promise.all([
    window.DB.buscarTodos(window.DB.STORE_NAMES.produtos),
    window.DB.buscarTodos(window.DB.STORE_NAMES.vendas),
    window.DB.buscarTodos(window.DB.STORE_NAMES.utilizadores),
    window.DB.buscarTodos(window.DB.STORE_NAMES.itensVenda),
    window.DB.buscarTodos(window.DB.STORE_NAMES.categorias)
  ]);

  const vendasFiltradas = isAdmin ? vendas : vendas.filter((v) => v.utilizadorId === sessao.id);
  const hoje = new Date().toISOString().split("T")[0];
  const vendasHoje = vendasFiltradas.filter((v) => v.data === hoje);
  const valorTotal = vendasFiltradas.reduce((a, v) => a + Number(v.total || 0), 0);
  const valorHoje = vendasHoje.reduce((a, v) => a + Number(v.total || 0), 0);
  const stockBaixoList = produtos.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= Number(p.stockMinimo));
  const esgotadosList = produtos.filter((p) => Number(p.stock) === 0);

  if (isAdmin) {
    document.getElementById("adminSections").style.display = "block";
    const cards = [
      { t: "Total de Produtos", v: produtos.length, icon: "blue", i: "fa-box" },
      { t: "Produtos em Stock", v: produtos.reduce((a, p) => a + Number(p.stock), 0), icon: "green", i: "fa-warehouse" },
      { t: "Stock Baixo", v: stockBaixoList.length, icon: "yellow", i: "fa-triangle-exclamation" },
      { t: "Esgotados", v: esgotadosList.length, icon: "red", i: "fa-circle-xmark" },
      { t: "Total de Vendas", v: vendas.length, icon: "purple", i: "fa-receipt" },
      { t: "Vendas do Dia", v: vendasHoje.length, icon: "blue", i: "fa-calendar-day" },
      { t: "Valor das Vendas", v: window.Utils.formatarMoeda(valorTotal), icon: "green", i: "fa-money-bill" },
      { t: "Total de Vendedores", v: utilizadores.filter((u) => u.perfil === "VENDEDOR").length, icon: "purple", i: "fa-users" }
    ];
    document.getElementById("dashboardCards").innerHTML = cards.map((c) =>
      `<article class="card"><div class="card-icon ${c.icon}"><i class="fa-solid ${c.i}"></i></div><h4>${c.t}</h4><p>${c.v}</p></article>`
    ).join("");

    document.getElementById("stockBaixoTable").innerHTML = stockBaixoList.length
      ? stockBaixoList.map((p) => `<tr><td>${p.nome}</td><td>${p.stock}</td><td>${p.stockMinimo}</td></tr>`).join("")
      : `<tr><td colspan="3" class="empty-state">Nenhum produto com stock baixo.</td></tr>`;

    document.getElementById("esgotadosTable").innerHTML = esgotadosList.length
      ? esgotadosList.map((p) => `<tr><td>${p.nome}</td><td>${p.codigo}</td></tr>`).join("")
      : `<tr><td colspan="2" class="empty-state">Nenhum produto esgotado.</td></tr>`;

    const userMap = Object.fromEntries(utilizadores.map((u) => [u.id, u.nome]));
    const recentes = [...vendas].sort((a, b) => b.id - a.id).slice(0, 10);
    const recentesRows = [];
    for (const v of recentes) {
      const its = itens.filter((i) => i.vendaId === v.id);
      for (const it of its) {
        const prod = produtos.find((p) => p.id === it.produtoId);
        recentesRows.push(`<tr><td>${v.data} ${v.hora}</td><td>${prod?.nome || "-"}</td><td>${it.quantidade}</td><td>${window.Utils.formatarMoeda(it.total)}</td><td>${userMap[v.utilizadorId] || "-"}</td></tr>`);
      }
    }
    document.getElementById("vendasRecentesTable").innerHTML = recentesRows.length
      ? recentesRows.join("")
      : `<tr><td colspan="5" class="empty-state">Sem vendas registadas.</td></tr>`;

    renderizarGraficos(vendas, itens, produtos, categorias);
  } else {
    document.getElementById("vendedorSections").style.display = "block";
    document.getElementById("dashboardCards").innerHTML = [
      { t: "Vendas de Hoje", v: vendasHoje.length, icon: "blue", i: "fa-calendar-day" },
      { t: "Número de Vendas", v: vendasFiltradas.length, icon: "purple", i: "fa-receipt" },
      { t: "Total Vendido Hoje", v: window.Utils.formatarMoeda(valorHoje), icon: "green", i: "fa-money-bill" },
      { t: "Produtos Disponíveis", v: produtos.filter((p) => Number(p.stock) > 0).length, icon: "blue", i: "fa-box" }
    ].map((c) =>
      `<article class="card"><div class="card-icon ${c.icon}"><i class="fa-solid ${c.i}"></i></div><h4>${c.t}</h4><p>${c.v}</p></article>`
    ).join("");

    const minhas = [...vendasFiltradas].sort((a, b) => b.id - a.id).slice(0, 10);
    document.getElementById("minhasVendasTable").innerHTML = minhas.length
      ? minhas.map((v) => `<tr><td>${v.data} ${v.hora}</td><td>${window.Utils.formatarMoeda(v.total)}</td><td>${v.metodoPagamento}</td></tr>`).join("")
      : `<tr><td colspan="3" class="empty-state">Ainda não realizou vendas.</td></tr>`;

    const meusItens = itens.filter((i) => vendasFiltradas.some((v) => v.id === i.vendaId));
    const topMap = {};
    for (const it of meusItens) {
      const prod = produtos.find((p) => p.id === it.produtoId);
      const nome = prod?.nome || "Desconhecido";
      topMap[nome] = (topMap[nome] || 0) + Number(it.quantidade);
    }
    const topLabels = Object.keys(topMap).slice(0, 5);
    const topData = topLabels.map((k) => topMap[k]);
    if (topLabels.length) {
      new Chart(document.getElementById("chartVendedorTop"), {
        type: "bar",
        data: { labels: topLabels, datasets: [{ label: "Qtd", data: topData, backgroundColor: "#1b6b4a" }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
    }
  }
}

function renderizarGraficos(vendas, itens, produtos, categorias) {
  const dias = [];
  const valores = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    dias.push(d.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric" }));
    valores.push(vendas.filter((v) => v.data === ds).reduce((a, v) => a + Number(v.total), 0));
  }
  new Chart(document.getElementById("chartVendas7d"), {
    type: "line",
    data: { labels: dias, datasets: [{ label: "Vendas (MT)", data: valores, borderColor: "#1b6b4a", backgroundColor: "rgba(27,107,74,0.12)", fill: true, tension: 0.3 }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  const topMap = {};
  for (const it of itens) {
    const prod = produtos.find((p) => p.id === it.produtoId);
    const nome = prod?.nome || "?";
    topMap[nome] = (topMap[nome] || 0) + Number(it.quantidade);
  }
  const sorted = Object.entries(topMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  new Chart(document.getElementById("chartTopProdutos"), {
    type: "bar",
    data: { labels: sorted.map((s) => s[0]), datasets: [{ label: "Qtd", data: sorted.map((s) => s[1]), backgroundColor: "#c47a1a" }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y", plugins: { legend: { display: false } } }
  });

  const catMap = {};
  const catNome = Object.fromEntries(categorias.map((c) => [c.id, c.nome]));
  for (const it of itens) {
    const prod = produtos.find((p) => p.id === it.produtoId);
    const cat = catNome[prod?.categoriaId] || "Outros";
    catMap[cat] = (catMap[cat] || 0) + Number(it.total);
  }
  new Chart(document.getElementById("chartCategorias"), {
    type: "doughnut",
    data: { labels: Object.keys(catMap), datasets: [{ data: Object.values(catMap), backgroundColor: ["#1b6b4a", "#c47a1a", "#2a8f65", "#a86412", "#14352c", "#5f7369"] }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  await window.DB.abrirBaseDados();
  await window.DB.inicializarDadosDemo();
  carregarDashboard();
});
