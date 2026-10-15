/* ==========================================================================
   app.js - Bootstrap de la SPA: autenticacion, navegacion y layout.
   ========================================================================== */

(function () {
  if (!Auth.estaAutenticado()) {
    window.location.href = 'login.html';
    return;
  }

  const usuario = Auth.getUsuario();

  const cargadoresPorVista = {
    dashboard: () => Dashboard.cargar(),
    trabajos: () => Trabajos.cargar(),
    clientes: () => Clientes.cargar(),
    impresoras: () => Impresoras.cargar(),
    usuarios: () => Usuarios.cargar(),
    perfil: () => {},
  };

  function pintarUsuario() {
    document.getElementById('user-nombre').textContent = usuario.nombre;
    document.getElementById('user-rol').textContent = usuario.rol === 'admin' ? 'Administrador' : 'Operador';
    document.getElementById('user-avatar').textContent = iniciales(usuario.nombre);

    if (usuario.rol !== 'admin') {
      document.getElementById('nav-usuarios').remove();
    }
  }

  function cambiarVista(nombreVista) {
    document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach((el) => el.classList.remove('active'));

    const vista = document.getElementById(`view-${nombreVista}`);
    const link = document.querySelector(`.nav-link[data-view="${nombreVista}"]`);
    if (!vista || !link) return;

    vista.classList.add('active');
    link.classList.add('active');
    window.location.hash = nombreVista;
    cerrarSidebarMovil();

    const cargar = cargadoresPorVista[nombreVista];
    if (cargar) cargar();
  }

  function vistaInicial() {
    const hash = window.location.hash.replace('#', '');
    return cargadoresPorVista[hash] ? hash : 'dashboard';
  }

  function abrirSidebarMovil() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-backdrop').classList.remove('hidden');
  }

  function cerrarSidebarMovil() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.add('hidden');
  }

  document.getElementById('nav').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-link');
    if (!btn) return;
    cambiarVista(btn.dataset.view);
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    Auth.cerrarSesion();
    window.location.href = 'login.html';
  });

  document.getElementById('btn-open-nav').addEventListener('click', abrirSidebarMovil);
  document.getElementById('sidebar-backdrop').addEventListener('click', cerrarSidebarMovil);

  // Delegacion de acciones globales (botones "+ Nuevo ...")
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const accion = btn.dataset.action;
    if (accion === 'nuevo-trabajo') Trabajos.abrirFormulario();
    if (accion === 'nuevo-cliente') Clientes.abrirFormulario();
    if (accion === 'nueva-impresora') Impresoras.abrirFormulario();
    if (accion === 'nuevo-usuario') Usuarios.abrirFormulario();
  });

  document.getElementById('perfil-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const passwordActual = document.getElementById('perfil-actual').value;
    const passwordNueva = document.getElementById('perfil-nueva').value;
    try {
      await Api.post('/auth/cambiar-password', { passwordActual, passwordNueva });
      mostrarToast('Contraseña actualizada.', 'success');
      e.target.reset();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });

  pintarUsuario();
  cambiarVista(vistaInicial());
})();
