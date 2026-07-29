let historico = [];

async function init() {
  const sessao = window.Sessao.exigirAutenticacao(["ADMIN"]);
  if (!sessao) return;
  await window.DB.abrirBaseDados();
  window.Layout.inicializarLayout(sessao, "historico.html");
  historico = await window.DB.buscarTodos(window.DB.STORE_NAMES.historico);
  document.getElementById("pesquisa").oninput = render;
  document.getElementById("filtroOp").onchange = render;
  render();
}

function render() {
  const q = document.getElementById("pesquisa").value.toLowerCase();
  const op = document.getElementById("filtroOp").value;
  const filtrados = historico.filter((h) => {
    const matchOp = !op || h.operacao === op;
    const matchQ = !q || h.utilizador.toLowerCase().includes(q) || h.descricao.toLowerCase().includes(q) || h.operacao.toLowerCase().includes(q);
    return matchOp && matchQ;
  }).sort((a, b) => b.id - a.id);

  document.getElementById("tabela").innerHTML = filtrados.length
    ? filtrados.map((h) => `<tr><td>${h.data}</td><td>${h.utilizador}</td><td><span class="badge badge-info">${h.operacao}</span></td><td>${h.descricao}</td><td>${h.hora}</td></tr>`).join("")
    : `<tr><td colspan="5" class="empty-state">Nenhum registo.</td></tr>`;
}

window.addEventListener("DOMContentLoaded", init);
