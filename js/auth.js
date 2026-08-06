async function autenticar(username, password) {
  const utilizadores = await window.DB.buscarTodos(window.DB.STORE_NAMES.utilizadores);
  const user = utilizadores.find((u) => u.username === username);

  if (!user) return { ok: false, mensagem: "❌ Utilizador inexistente." };
  if (user.estado !== "ACTIVO") return { ok: false, mensagem: "❌ Utilizador desactivado." };
  if (user.password !== password) return { ok: false, mensagem: "❌ Palavra-passe incorrecta." };

  window.Sessao.guardarSessao(user);
  await window.DB.registarHistorico(user.username, "LOGIN", "Início de sessão");

  return { ok: true, utilizador: user };
}

function redireccionarPosLogin(user) {
  if (user.perfil === "ADMIN") {
    window.location.href = "pages/dashboard.html";
    return;
  }

  if (user.perfil === "VENDEDOR") {
    window.location.href = "pages/dashboard.html";
    return;
  }

  alert("Perfil inválido.");
}

function configurarMostrarPassword() {
  const input = document.getElementById("password");
  const btn = document.getElementById("togglePassword");
  if (!input || !btn) return;

  btn.addEventListener("click", () => {
    const escondida = input.type === "password";
    input.type = escondida ? "text" : "password";
    btn.innerHTML = escondida
      ? '<i class="fa-regular fa-eye-slash"></i>'
      : '<i class="fa-regular fa-eye"></i>';
  });
}

function configurarFormularioLogin() {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");
  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      message.textContent = "❌ Preencha todos os campos obrigatórios.";
      message.className = "form-message error";
      return;
    }

    try {
      const resultado = await autenticar(username, password);
      if (!resultado.ok) {
        message.textContent = resultado.mensagem;
        message.className = "form-message error";
        return;
      }
      message.textContent = "✓ Login efectuado com sucesso.";
      message.className = "form-message success";
      redireccionarPosLogin(resultado.utilizador);
    } catch (_err) {
      message.textContent = "❌ Erro ao iniciar sessão.";
      message.className = "form-message error";
    }
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  await window.DB.abrirBaseDados();
  await window.DB.inicializarDadosDemo();

  const sessao = window.Sessao.obterSessao();
  if (sessao) {
    window.location.href = "pages/dashboard.html";
    return;
  }

  configurarMostrarPassword();
  configurarFormularioLogin();
});
