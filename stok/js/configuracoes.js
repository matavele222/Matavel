let sessao, produtosVendidos = [];

async function init() {
  sessao = window.Sessao.exigirAutenticacao(["ADMIN"]);
  if (!sessao) return;
  await window.DB.abrirBaseDados();
  window.Layout.inicializarLayout(sessao, "configuracoes.html");

  const config = await window.Utils.obterConfiguracoes();
  document.getElementById("nomeMercearia").value = config.nomeMercearia;
  document.getElementById("validadeNormalDias").value = config.validadeNormalDias;
  document.getElementById("validadeProximaDias").value = config.validadeProximaDias;

  document.getElementById("formConfig").onsubmit = guardarConfig;
  document.getElementById("btnReiniciarSistema").onclick = reiniciarSistema;
  document.getElementById("btnReiniciarVendas").onclick = reiniciarVendas;
  document.getElementById("btnSeleccionarTodos").onclick = () => marcarTodos(true);
  document.getElementById("btnDesmarcarTodos").onclick = () => marcarTodos(false);

  await carregarProdutosVendidos();
}

async function guardarConfig(e) {
  e.preventDefault();
  await window.Utils.guardarConfiguracoes({
    nomeMercearia: document.getElementById("nomeMercearia").value.trim(),
    validadeNormalDias: Number(document.getElementById("validadeNormalDias").value),
    validadeProximaDias: Number(document.getElementById("validadeProximaDias").value)
  });
  window.Utils.mostrarMensagem(document.getElementById("msg"), "✓ Configurações guardadas.", "success");
}

async function carregarProdutosVendidos() {
  produtosVendidos = await window.DB.obterProdutosVendidos();
  const el = document.getElementById("listaVendidos");
  if (!produtosVendidos.length) {
    el.innerHTML = `<tr><td colspan="5" class="empty-state">Nenhum produto vendido registado.</td></tr>`;
    document.getElementById("btnReiniciarVendas").disabled = true;
    return;
  }
  document.getElementById("btnReiniciarVendas").disabled = false;
  el.innerHTML = produtosVendidos.map((p) => `
    <tr>
      <td><input type="checkbox" class="chk-prod-vendido" value="${p.produtoId}" checked></td>
      <td>${p.nome}</td>
      <td>${p.quantidadeVendida}</td>
      <td>${p.stockActual}</td>
      <td>${window.Utils.formatarMoeda(p.valorTotal)}</td>
    </tr>`).join("");
}

function marcarTodos(estado) {
  document.querySelectorAll(".chk-prod-vendido").forEach((chk) => { chk.checked = estado; });
}

function validarConfirmacao(inputId) {
  return document.getElementById(inputId).value.trim().toUpperCase() === "REINICIAR";
}

async function reiniciarSistema() {
  const msg = document.getElementById("msgReinicio");
  if (!validarConfirmacao("confirmarReinicio")) {
    window.Utils.mostrarMensagem(msg, "❌ Escreva REINICIAR para confirmar.", "error");
    return;
  }
  const comProdutos = document.querySelector('input[name="tipoProdutos"]:checked').value === "demo";
  const texto = comProdutos
    ? "Reiniciar o sistema completo com produtos de demonstração?"
    : "Reiniciar o sistema completo SEM produtos?";
  if (!window.Utils.confirmarAccao(texto + "\n\nEsta acção não pode ser desfeita.")) return;

  try {
    await window.DB.reiniciarSistemaCompleto(comProdutos);
    await window.DB.registarHistorico(sessao.username, "REINICIO_SISTEMA", comProdutos ? "Reinício completo com produtos demo" : "Reinício completo sem produtos");
    window.Utils.mostrarMensagem(msg, "✓ Sistema reiniciado com sucesso.", "success");
    document.getElementById("confirmarReinicio").value = "";
    await carregarProdutosVendidos();
    const config = await window.Utils.obterConfiguracoes();
    document.getElementById("nomeMercearia").value = config.nomeMercearia;
  } catch (_err) {
    window.Utils.mostrarMensagem(msg, "❌ Erro ao reiniciar o sistema.", "error");
  }
}

async function reiniciarVendas() {
  const msg = document.getElementById("msgVendas");
  if (!validarConfirmacao("confirmarVendas")) {
    window.Utils.mostrarMensagem(msg, "❌ Escreva REINICIAR para confirmar.", "error");
    return;
  }
  const seleccionados = [...document.querySelectorAll(".chk-prod-vendido:checked")].map((c) => Number(c.value));
  const total = document.querySelectorAll(".chk-prod-vendido").length;
  const texto = seleccionados.length
    ? `Eliminar todas as vendas e restaurar stock de ${seleccionados.length} produto(s)?`
    : "Eliminar todas as vendas SEM restaurar stock?";
  if (!window.Utils.confirmarAccao(texto + "\n\nEsta acção não pode ser desfeita.")) return;

  try {
    await window.DB.reiniciarVendas(seleccionados);
    await window.DB.registarHistorico(sessao.username, "REINICIO_VENDAS", `Reinício de vendas (${seleccionados.length}/${total} produtos com stock restaurado)`);
    window.Utils.mostrarMensagem(msg, seleccionados.length
      ? `✓ Vendas eliminadas. Stock restaurado em ${seleccionados.length} produto(s).`
      : "✓ Vendas eliminadas. Stock mantido sem alterações.", "success");
    document.getElementById("confirmarVendas").value = "";
    await carregarProdutosVendidos();
  } catch (_err) {
    window.Utils.mostrarMensagem(msg, "❌ Erro ao reiniciar vendas.", "error");
  }
}

window.addEventListener("DOMContentLoaded", init);
