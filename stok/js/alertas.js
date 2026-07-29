let sessao;

async function init() {
  sessao = window.Sessao.exigirAutenticacao(["ADMIN"]);
  if (!sessao) return;
  await window.DB.abrirBaseDados();
  window.Layout.inicializarLayout(sessao, "alertas.html");
  const [produtos, config] = await Promise.all([
    window.DB.buscarTodos(window.DB.STORE_NAMES.produtos),
    window.Utils.obterConfiguracoes()
  ]);

  const alertas = [];
  for (const p of produtos) {
    const stock = Number(p.stock);
    const min = Number(p.stockMinimo);
    if (stock === 0) alertas.push({ tipo: "danger", icon: "fa-circle-xmark", msg: `Produto esgotado: ${p.nome} está sem stock.` });
    else if (stock <= min) alertas.push({ tipo: "warning", icon: "fa-triangle-exclamation", msg: `Stock baixo: ${p.nome} possui apenas ${stock} unidades.` });

    if (p.dataValidade) {
      const dias = window.Utils.diasAte(p.dataValidade);
      const estVal = window.Utils.calcularEstadoValidade(p.dataValidade, config);
      if (estVal === "EXPIRADO") alertas.push({ tipo: "danger", icon: "fa-calendar-xmark", msg: `Produto expirado: ${p.nome} ultrapassou a validade.` });
      else if (estVal === "MUITO PRÓXIMA" || estVal === "VALIDADE PRÓXIMA")
        alertas.push({ tipo: "warning", icon: "fa-calendar-day", msg: `Validade próxima: ${p.nome} vence em ${dias} dias.` });
    }
  }

  document.getElementById("alertasLista").innerHTML = alertas.length
    ? alertas.map((a) => `<div class="alert-item ${a.tipo}"><i class="fa-solid ${a.icon}"></i><span>${a.msg}</span></div>`).join("")
    : `<p class="empty-state">Nenhum alerta activo. Tudo em ordem!</p>`;
}

window.addEventListener("DOMContentLoaded", init);
