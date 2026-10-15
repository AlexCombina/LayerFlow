/* ==========================================================================
   login.js - Logica de la pantalla de inicio de sesion.
   ========================================================================== */

(function () {
  if (Auth.estaAutenticado()) {
    window.location.href = 'index.html';
    return;
  }

  const form = document.getElementById('login-form');
  const alertBox = document.getElementById('login-alert');
  const submitBtn = document.getElementById('login-submit');

  function mostrarError(mensaje) {
    alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(mensaje)}</div>`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.innerHTML = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Entrando...';

    try {
      const data = await Api.post('/auth/login', { email, password });
      Auth.guardarSesion(data.token, data.usuario);
      window.location.href = 'index.html';
    } catch (err) {
      mostrarError(err.message || 'No se pudo iniciar sesion.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
    }
  });
})();
