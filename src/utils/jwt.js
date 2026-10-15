const jwt = require('jsonwebtoken');
const config = require('../config/config');

function firmarToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function verificarToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { firmarToken, verificarToken };
