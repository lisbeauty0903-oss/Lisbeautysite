async function protegerPagina() {
  const paginaLogin = location.pathname.endsWith("index.html") || location.pathname === "/" || location.pathname.endsWith("/");

  if (SUPABASE_URL.includes("COLE_AQUI") || SUPABASE_ANON_KEY.includes("COLE_AQUI")) {
    if (!paginaLogin) {
      console.warn("Configure js/config.js antes de usar o sistema.");
    }
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!paginaLogin && !session) {
    location.href = "index.html";
  }

  if (paginaLogin && session) {
    location.href = "dashboard.html";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await protegerPagina();

  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      loginMessage.textContent = "Entrando...";
      loginMessage.className = "form-message";

      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        loginMessage.textContent = "Não foi possível entrar. Verifique e-mail e senha.";
        loginMessage.className = "form-message error";
        return;
      }

      location.href = "dashboard.html";
    });
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      location.href = "index.html";
    });
  }
});
