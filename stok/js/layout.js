const MENU_ADMIN = [
  { icon: "fa-house", label: "Dashboard", href: "./dashboard.html" },
  { icon: "fa-box", label: "Produtos", href: "./produtos.html" },
  { icon: "fa-tags", label: "Categorias", href: "./categorias.html" },
  { icon: "fa-arrow-down", label: "Entradas de Stock", href: "./entradas.html" },
  { icon: "fa-cart-shopping", label: "Vendas", href: "./vendas.html" },
  { icon: "fa-users", label: "Utilizadores", href: "./utilizadores.html" },
  { icon: "fa-chart-bar", label: "Relatórios", href: "./relatorios.html" },
  { icon: "fa-bell", label: "Alertas", href: "./alertas.html" },
  { icon: "fa-clock-rotate-left", label: "Histórico", href: "./historico.html" },
  { icon: "fa-user", label: "Meu Perfil", href: "./perfil.html" },
  { icon: "fa-gear", label: "Configurações", href: "./configuracoes.html" }
];

const MENU_VENDEDOR = [
  { icon: "fa-house", label: "Dashboard", href: "./dashboard.html" },
  { icon: "fa-cart-plus", label: "Nova Venda", href: "./vendas.html" },
  { icon: "fa-box", label: "Produtos", href: "./produtos.html" },
  { icon: "fa-receipt", label: "Minhas Vendas", href: "./vendas.html?view=minhas" },
  { icon: "fa-user", label: "Meu Perfil", href: "./perfil.html" }
];

function renderizarMenu(perfil, paginaAtual) {
  const menu = perfil === "ADMIN" ? MENU_ADMIN : MENU_VENDEDOR;
  const current = paginaAtual || window.location.pathname.split("/").pop();
  return menu.map((item) => {
    const hrefFile = item.href.replace("./", "").split("?")[0];
    const active = current === hrefFile ? "active" : "";
    return `<li><a class="${active}" href="${item.href}"><i class="fa-solid ${item.icon}"></i> ${item.label}</a></li>`;
  }).join("");
}

function inicializarLayout(sessao, paginaAtual) {
  const menuList = document.getElementById("menuList");
  const userName = document.getElementById("userName");
  const userRole = document.getElementById("userRole");
  const logoutBtn = document.getElementById("logoutBtn");
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");

  if (menuList) {
    menuList.innerHTML = renderizarMenu(sessao.perfil, paginaAtual);
    const brand = document.querySelector(".sidebar-brand");
    if (brand && !brand.querySelector(".sidebar-brand-text")) {
      const h2 = brand.querySelector("h2");
      if (h2) {
        const wrap = document.createElement("div");
        wrap.className = "sidebar-brand-text";
        wrap.innerHTML = `<h2>${h2.textContent}</h2><small>Controlo de Stock</small>`;
        h2.replaceWith(wrap);
      }
    }
  }
  if (userName) userName.textContent = sessao.nome;
  if (userRole) userRole.textContent = sessao.perfil === "ADMIN" ? "Administrador" : "Vendedor";
  if (logoutBtn) logoutBtn.addEventListener("click", () => window.Sessao.terminarSessao());
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  }
}

window.Layout = { inicializarLayout, renderizarMenu, MENU_ADMIN, MENU_VENDEDOR };
