/* ==========================================================================
   api.js - Cliente HTTP para hablar con el backend Express.
   Se encarga de adjuntar el token JWT y normalizar los errores.
   ========================================================================== */

const API_BASE = '/api';
const TOKEN_KEY = 'caon_token';
const USER_KEY = 'caon_usuario';

const Auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  getUsuario() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  guardarSesion(token, usuario) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(usuario));
  },
  actualizarUsuario(usuario) {
    localStorage.setItem(USER_KEY, JSON.stringify(usuario));
  },
  cerrarSesion() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  estaAutenticado() {
    return Boolean(this.getToken());
  },
};

class ApiClientError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiClientError('No se pudo conectar con el servidor.', 0);
  }

  if (response.status === 204) {
    return null;
  }

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      Auth.cerrarSesion();
      if (!window.location.pathname.endsWith('login.html')) {
        window.location.href = 'login.html';
      }
    }
    const message = (data && data.message) || `Error ${response.status}`;
    throw new ApiClientError(message, response.status);
  }

  return data;
}

const Api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
