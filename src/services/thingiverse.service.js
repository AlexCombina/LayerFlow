// Cliente para la API publica de Thingiverse (https://www.thingiverse.com/developers),
// el buscador de modelos 3D gratuitos que usa la app.
//
// Requiere un "App Token" gratuito: se crea una app en
// https://www.thingiverse.com/apps/create y el token generado se usa como si fuera
// una API key (no hace falta el flujo OAuth completo para busquedas publicas).
const config = require('../config/config');
const ApiError = require('../utils/ApiError');

const BASE_URL = 'https://api.thingiverse.com';

function asegurarToken() {
  if (!config.thingiverse.accessToken) {
    throw new ApiError(
      503,
      'La busqueda de modelos 3D no esta configurada. Crea una app gratuita en thingiverse.com/apps/create y' +
        ' agrega su token como THINGIVERSE_ACCESS_TOKEN en el archivo .env del servidor.'
    );
  }
}

async function buscarModelos({ q, page = 1, porPagina = 18 }) {
  asegurarToken();

  const url = new URL(`${BASE_URL}/search/${encodeURIComponent(q)}`);
  url.searchParams.set('access_token', config.thingiverse.accessToken);
  url.searchParams.set('type', 'things');
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(porPagina));
  url.searchParams.set('sort', 'relevant');

  let respuesta;
  try {
    respuesta = await fetch(url);
  } catch (err) {
    throw new ApiError(502, 'No se pudo contactar a Thingiverse. Intenta de nuevo en un momento.');
  }

  if (!respuesta.ok) {
    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new ApiError(502, 'Thingiverse rechazo el token configurado. Revisa THINGIVERSE_ACCESS_TOKEN.');
    }
    throw new ApiError(502, `Thingiverse respondio con un error (codigo ${respuesta.status}).`);
  }

  let data;
  try {
    data = await respuesta.json();
  } catch (err) {
    throw new ApiError(502, 'Thingiverse devolvio una respuesta invalida.');
  }

  const items = Array.isArray(data) ? data : data.hits || [];

  const resultados = items
    .filter((item) => item && item.id)
    .map((item) => ({
      id: item.id,
      nombre: item.name || 'Sin nombre',
      imagen: item.thumbnail || item.preview_image || null,
      url: item.public_url || `https://www.thingiverse.com/thing:${item.id}`,
      autor: (item.creator && item.creator.name) || null,
      likes: item.like_count ?? null,
      descargas: item.download_count ?? null,
    }));

  return {
    resultados,
    pagina: Number(page),
    hayMas: resultados.length >= Number(porPagina),
  };
}

module.exports = { buscarModelos };
