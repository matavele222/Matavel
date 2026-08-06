let sessao, utilizador;

async function init() {
  sessao = window.Sessao.exigirAutenticacao(["ADMIN", "VENDEDOR"]);
  if (!sessao) return;
  await window.DB.abrirBaseDados();
  window.Layout.inicializarLayout(sessao, "perfil.html");
  utilizador = await window.DB.buscarPorId(window.DB.STORE_NAMES.utilizadores, sessao.id);
  document.getElementById("infoPerfil").innerHTML = `
    <tr><td><strong>Nome</strong></td><td>${utilizador.nome}</td></tr>
    <tr><td><strong>Username</strong></td><td>${utilizador.username}</td></tr>
    <tr><td><strong>Telefone</strong></td><td>${utilizador.telefone || "-"}</td></tr>
    <tr><td><strong>Perfil</strong></td><td>${utilizador.perfil}</td></tr>
    <tr><td><strong>Estado</strong></td><td>${utilizador.estado}</td></tr>
    <tr><td><strong>Data de Cadastro</strong></td><td>${window.Utils.formatarData(utilizador.dataCadastro)}</td></tr>`;
  document.getElementById("nome").value = utilizador.nome;
  document.getElementById("telefone").value = utilizador.telefone || "";
  document.getElementById("formPerfil").onsubmit = guardar;
}

async function guardar(e) {
  e.preventDefault();
  const msg = document.getElementById("msg");
  const nome = document.getElementById("nome").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const password = document.getElementById("password").value;
  const passwordConfirm = document.getElementById("passwordConfirm").value;

  if (!nome) { window.Utils.mostrarMensagem(msg, "❌ Nome obrigatório.", "error"); return; }
  if (password && password !== passwordConfirm) { window.Utils.mostrarMensagem(msg, "❌ Palavras-passe não coincidem.", "error"); return; }

  const dados = { ...utilizador, nome, telefone };
  if (password) dados.password = password;
  await window.DB.actualizar(window.DB.STORE_NAMES.utilizadores, dados);

  sessao.nome = nome;
  window.Sessao.guardarSessao({ ...sessao, ...dados });
  utilizador = dados;
  document.getElementById("infoPerfil").innerHTML = `
    <tr><td><strong>Nome</strong></td><td>${dados.nome}</td></tr>
    <tr><td><strong>Username</strong></td><td>${dados.username}</td></tr>
    <tr><td><strong>Telefone</strong></td><td>${dados.telefone || "-"}</td></tr>
    <tr><td><strong>Perfil</strong></td><td>${dados.perfil}</td></tr>
    <tr><td><strong>Estado</strong></td><td>${dados.estado}</td></tr>
    <tr><td><strong>Data de Cadastro</strong></td><td>${window.Utils.formatarData(dados.dataCadastro)}</td></tr>`;
  document.getElementById("password").value = "";
  document.getElementById("passwordConfirm").value = "";
  window.Utils.mostrarMensagem(msg, "✓ Perfil actualizado com sucesso.", "success");
}

window.addEventListener("DOMContentLoaded", init);
