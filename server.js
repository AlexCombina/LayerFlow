const app = require('./src/app');
const config = require('./src/config/config');
const { inicializarBaseDeDatos } = require('./src/db/database');

inicializarBaseDeDatos();

app.listen(config.port, () => {
  console.log(`Servidor de Caon Print Tracker escuchando en http://localhost:${config.port}`);
});
