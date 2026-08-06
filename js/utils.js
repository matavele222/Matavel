function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " MT";
}

function formatarData(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-PT");
}

function hojeISO() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function eHoje(dataStr) {
  if (!dataStr) return false;
  const d = new Date(dataStr);
  const hoje = new Date();
  return d.toDateString() === hoje.toDateString();
}

function calcularEstadoStock(stock, stockMinimo) {
  const s = Number(stock || 0);
  const min = Number(stockMinimo || 0);
  if (s === 0) return "ESGOTADO";
  if (s <= min) return "STOCK BAIXO";
  return "NORMAL";
}

function badgeEstadoStock(estado) {
  const map = {
    NORMAL: "badge-success",
    "STOCK BAIXO": "badge-warning",
    ESGOTADO: "badge-danger"
  };
  return `<span class="badge ${map[estado] || "badge-info"}">${estado}</span>`;
}

function calcularEstadoValidade(dataValidade, config) {
  if (!dataValidade) return "SEM VALIDADE";
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade);
  validade.setHours(0, 0, 0, 0);
  const diff = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));
  const normal = config?.validadeNormalDias ?? 30;
  const proxima = config?.validadeProximaDias ?? 7;

  if (diff < 0) return "EXPIRADO";
  if (diff <= proxima) return "MUITO PRÓXIMA";
  if (diff <= normal) return "VALIDADE PRÓXIMA";
  return "VALIDADE NORMAL";
}

function badgeValidade(estado) {
  const map = {
    "VALIDADE NORMAL": "badge-success",
    "VALIDADE PRÓXIMA": "badge-warning",
    "MUITO PRÓXIMA": "badge-danger",
    EXPIRADO: "badge-danger",
    "SEM VALIDADE": "badge-info"
  };
  return `<span class="badge ${map[estado] || "badge-info"}">${estado}</span>`;
}

function mostrarMensagem(el, texto, tipo = "info") {
  if (!el) return;
  el.textContent = texto;
  el.className = `form-message ${tipo}`;
}

function confirmarAccao(msg) {
  return window.confirm(msg);
}

function exportarCSV(nome, linhas) {
  const csv = linhas.map((row) =>
    row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nome;
  link.click();
  URL.revokeObjectURL(link.href);
}

function abrirModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("open");
}

function fecharModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("open");
}

function configurarModais() {
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => fecharModal(btn.dataset.closeModal));
  });
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });
  });
}

async function obterConfiguracoes() {
  const configs = await window.DB.buscarTodos(window.DB.STORE_NAMES.configuracoes);
  const defaults = {
    nomeMercearia: "NOME DA MERCEARIA",
    validadeNormalDias: 30,
    validadeProximaDias: 7
  };
  if (!configs.length) return defaults;
  return { ...defaults, ...configs[0] };
}

async function guardarConfiguracoes(dados) {
  const configs = await window.DB.buscarTodos(window.DB.STORE_NAMES.configuracoes);
  if (configs.length) {
    await window.DB.actualizar(window.DB.STORE_NAMES.configuracoes, { ...configs[0], ...dados });
  } else {
    await window.DB.adicionar(window.DB.STORE_NAMES.configuracoes, dados);
  }
}

async function gerarCodigoProduto() {
  const produtos = await window.DB.buscarTodos(window.DB.STORE_NAMES.produtos);
  const num = produtos.length + 1;
  return `PRD-${String(num).padStart(4, "0")}`;
}

function diasAte(dataStr) {
  if (!dataStr) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(dataStr);
  alvo.setHours(0, 0, 0, 0);
  return Math.ceil((alvo - hoje) / (1000 * 60 * 60 * 24));
}

window.Utils = {
  formatarMoeda,
  formatarData,
  hojeISO,
  eHoje,
  calcularEstadoStock,
  badgeEstadoStock,
  calcularEstadoValidade,
  badgeValidade,
  mostrarMensagem,
  confirmarAccao,
  exportarCSV,
  abrirModal,
  fecharModal,
  configurarModais,
  obterConfiguracoes,
  guardarConfiguracoes,
  gerarCodigoProduto,
  diasAte
};
