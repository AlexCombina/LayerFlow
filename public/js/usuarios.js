/* ==========================================================================
   usuarios.js - Gestion de cuentas (solo administradores).
   ========================================================================== */

const Usuarios = {
  cache: [],

  async cargar() {
    try {
      const data = await Api.get('/usuarios');
      this.cache = data.usuarios;
      this.pintarTabla(data.usuarios);
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  },

  pintarTabla(usuarios) {
    const tbody = document.getElementById('usuarios-tbody');
    if (!usuarios.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No hay usuarios.</div></td></tr>`;
      return;
    }

    const yo = Auth.getUsuario();

    tbody.innerHTML = usuarios
      .map(
        (u) => `
        <tr>
          <td><strong>${escapeHtml(u.nombre)}</strong> ${u.id === yo.id ? '<span class="text-muted">(tu)</span>' : ''}</td>
          <td>${escapeHtml(u.email)}</td>
          <td><span class="badge ${u.rol === 'admin' ? 'badge-urgente' : 'badge-en_cola'}">${u.rol === 'admin' ? 'Administrador' : 'Operador'}</span></td>
          <td><span class="badge ${u.activo ? 'badge-entregado' : 'badge-cancelado'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td class="actions-cell">
            <button class="btn btn-icon btn-sm" data-editar="${u.id}" title="Editar">✎</button>
            <button class="btn btn-icon btn-sm" data-reset="${u.id}" title="Restablecer contraseña">⚿</button>
            ${u.id !== yo.id ? `<button class="btn btn-icon btn-sm btn-red" data-eliminar="${u.id}" title="Eliminar">✕</button>` : ''}
          </td>
        </tr>`
      )
      .join('');

    tbody.querySelectorAll('[data-editar]').forEach((btn) =>
      btn.addEventListener('click', () => this.abrirFormularioEdicion(Number(btn.dataset.editar)))
    );
    tbody.querySelectorAll('[data-reset]').forEach((btn) =>
      btn.addEventListener('click', () => this.resetearPassword(Number(btn.dataset.reset)))
    );
    tbody.querySelectorAll('[data-eliminar]').forEach((btn) =>
      btn.addEventListener('click', () => this.eliminar(Number(btn.dataset.eliminar)))
    );
  },

  abrirFormulario() {
    const overlay = abrirModal(`
      <div class="modal-header">
        <h2>Nuevo usuario</h2>
        <button class="modal-close" data-cerrar>&times;</button>
      </div>
      <form id="form-usuario">
        <div class="field">
          <label for="u-nombre">Nombre *</label>
          <input type="text" id="u-nombre" required />
        </div>
        <div class="field">
          <label for="u-email">Email *</label>
          <input type="email" id="u-email" required />
        </div>
        <div class="form-row">
          <div class="field">
            <label for="u-password">Contraseña *</label>
            <input type="password" id="u-password" required minlength="6" />
          </div>
          <div class="field">
            <label for="u-rol">Rol</label>
            <select id="u-rol">
              <option value="operador">Operador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" data-cerrar>Cancelar</button>
          <button type="submit" class="btn btn-yellow">Crear usuario</button>
        </div>
      </form>
    `);

    overlay.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrarModal));

    document.getElementById('form-usuario').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        nombre: document.getElementById('u-nombre').value.trim(),
        email: document.getElementById('u-email').value.trim(),
        password: document.getElementById('u-password').value,
        rol: document.getElementById('u-rol').value,
      };
      try {
        await Api.post('/usuarios', payload);
        mostrarToast('Usuario creado.', 'success');
        cerrarModal();
        this.cargar();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  },

  abrirFormularioEdicion(id) {
    const usuario = this.cache.find((u) => u.id === id);
    if (!usuario) return;

    const overlay = abrirModal(`
      <div class="modal-header">
        <h2>Editar usuario</h2>
        <button class="modal-close" data-cerrar>&times;</button>
      </div>
      <form id="form-usuario-editar">
        <div class="field">
          <label for="ue-nombre">Nombre</label>
          <input type="text" id="ue-nombre" required value="${escapeHtml(usuario.nombre)}" />
        </div>
        <div class="field">
          <label>Email</label>
          <input type="email" value="${escapeHtml(usuario.email)}" disabled />
          <span class="hint">El email no se puede modificar.</span>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="ue-rol">Rol</label>
            <select id="ue-rol">
              <option value="operador" ${usuario.rol === 'operador' ? 'selected' : ''}>Operador</option>
              <option value="admin" ${usuario.rol === 'admin' ? 'selected' : ''}>Administrador</option>
            </select>
          </div>
          <div class="field">
            <label for="ue-activo">Estado de la cuenta</label>
            <select id="ue-activo">
              <option value="1" ${usuario.activo ? 'selected' : ''}>Activo</option>
              <option value="0" ${!usuario.activo ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" data-cerrar>Cancelar</button>
          <button type="submit" class="btn btn-yellow">Guardar cambios</button>
        </div>
      </form>
    `);

    overlay.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrarModal));

    document.getElementById('form-usuario-editar').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        nombre: document.getElementById('ue-nombre').value.trim(),
        rol: document.getElementById('ue-rol').value,
        activo: document.getElementById('ue-activo').value === '1',
      };
      try {
        await Api.put(`/usuarios/${usuario.id}`, payload);
        mostrarToast('Usuario actualizado.', 'success');
        cerrarModal();
        this.cargar();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  },

  async resetearPassword(id) {
    const nueva = prompt('Nueva contraseña para este usuario (minimo 6 caracteres):');
    if (!nueva) return;
    try {
      await Api.post(`/usuarios/${id}/resetear-password`, { passwordNueva: nueva });
      mostrarToast('Contraseña restablecida.', 'success');
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar este usuario? Perdera el acceso al sistema.')) return;
    try {
      await Api.delete(`/usuarios/${id}`);
      mostrarToast('Usuario eliminado.', 'success');
      this.cargar();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  },
};
