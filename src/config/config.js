require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'cambia_este_secreto_por_uno_seguro',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  admin: {
    nombre: process.env.ADMIN_NOMBRE || 'Administrador',
    email: process.env.ADMIN_EMAIL || 'admin@caon.local',
    password: process.env.ADMIN_PASSWORD || 'admin1234',
  },
  thingiverse: {
    accessToken: process.env.THINGIVERSE_ACCESS_TOKEN || '',
  },
};
