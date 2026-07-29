const SESSION_KEY = "MERCEARIA_STOCK_SESSAO";

function guardarSessao(utilizador) {
  const sessao = {
    id: utilizador.id,
    nome: utilizador.nome,
    username: utilizador.username,
    perfil: utilizador.perfil,
    estado: utilizador.estado,
    iniciadoEm: new Date().toISOString()
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
}

function obterSessao() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_err) {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function terminarSessao() {
  const sessao = obterSessao();
  if (sessao && window.DB) {
    window.DB.registarHistorico(sessao.username, "LOGOUT", "Termino de sessão");
  }
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "../login.html";
}

function exigirAutenticacao(perfisPermitidos = []) {
  const sessao = obterSessao();
  if (!sessao) {
    window.location.href = "../login.html";
    return null;
  }

  if (Array.isArray(perfisPermitidos) && perfisPermitidos.length > 0) {
    const permitido = perfisPermitidos.includes(sessao.perfil);
    if (!permitido) {
      alert("Acesso negado.");
      window.location.href = "./dashboard.html";
      return null;
    }
  }

  return sessao;
}

function temPermissaoAdmin() {
  const sessao = obterSessao();
  return Boolean(sessao && sessao.perfil === "ADMIN");
}

window.Sessao = {
  guardarSessao,
  obterSessao,
  terminarSessao,
  exigirAutenticacao,
  temPermissaoAdmin
};
