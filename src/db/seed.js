// Carga datos de ejemplo (clientes, impresoras y trabajos) para poder
// probar la aplicacion rapidamente. No borra usuarios ni datos existentes.
const { db, inicializarBaseDeDatos } = require('./database');

inicializarBaseDeDatos();

function insertarClienteSiNoExiste(nombre, email, telefono) {
  const existente = db.prepare('SELECT id FROM clientes WHERE nombre = ?').get(nombre);
  if (existente) return existente.id;
  const info = db
    .prepare('INSERT INTO clientes (nombre, email, telefono) VALUES (?, ?, ?)')
    .run(nombre, email, telefono);
  return info.lastInsertRowid;
}

function insertarImpresoraSiNoExiste(nombre, modelo, estado) {
  const existente = db.prepare('SELECT id FROM impresoras WHERE nombre = ?').get(nombre);
  if (existente) return existente.id;
  const info = db
    .prepare('INSERT INTO impresoras (nombre, modelo, estado) VALUES (?, ?, ?)')
    .run(nombre, modelo, estado);
  return info.lastInsertRowid;
}

const clienteA = insertarClienteSiNoExiste('Marta Gomez', 'marta@example.com', '555-1010');
const clienteB = insertarClienteSiNoExiste('Estudio Nova', 'contacto@estudionova.com', '555-2020');

const impresoraA = insertarImpresoraSiNoExiste('Ender 3 #1', 'Creality Ender 3 V2', 'disponible');
const impresoraB = insertarImpresoraSiNoExiste('Prusa MK3', 'Prusa i3 MK3S+', 'ocupada');

const admin = db.prepare("SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1").get();

const totalTrabajos = db.prepare('SELECT COUNT(*) AS total FROM trabajos').get().total;

if (totalTrabajos === 0) {
  const hoy = new Date();
  const enDias = (n) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const trabajosDemo = [
    {
      codigo: 'TRB-0001',
      cliente_id: clienteA,
      impresora_id: impresoraA,
      pieza: 'Soporte para telefono',
      material: 'PLA',
      color: 'Negro',
      cantidad: 2,
      prioridad: 'media',
      estado: 'imprimiendo',
      fecha_solicitud: enDias(-2),
      fecha_estimada_entrega: enDias(2),
      peso_gramos: 45,
      horas_estimadas: 3,
      costo: 12.5,
    },
    {
      codigo: 'TRB-0002',
      cliente_id: clienteB,
      impresora_id: impresoraB,
      pieza: 'Prototipo de carcasa',
      material: 'PETG',
      color: 'Transparente',
      cantidad: 1,
      prioridad: 'urgente',
      estado: 'post_procesado',
      fecha_solicitud: enDias(-5),
      fecha_estimada_entrega: enDias(-1),
      peso_gramos: 120,
      horas_estimadas: 8,
      costo: 40,
    },
    {
      codigo: 'TRB-0003',
      cliente_id: clienteA,
      impresora_id: null,
      pieza: 'Figura decorativa',
      material: 'PLA',
      color: 'Multicolor',
      cantidad: 1,
      prioridad: 'baja',
      estado: 'pendiente',
      fecha_solicitud: enDias(0),
      fecha_estimada_entrega: enDias(7),
      peso_gramos: 30,
      horas_estimadas: 2,
      costo: 8,
    },
  ];

  const insertar = db.prepare(`
    INSERT INTO trabajos (
      codigo, cliente_id, impresora_id, usuario_id, pieza, material, color,
      cantidad, prioridad, estado, fecha_solicitud, fecha_estimada_entrega,
      peso_gramos, horas_estimadas, costo
    ) VALUES (@codigo, @cliente_id, @impresora_id, @usuario_id, @pieza, @material, @color,
      @cantidad, @prioridad, @estado, @fecha_solicitud, @fecha_estimada_entrega,
      @peso_gramos, @horas_estimadas, @costo)
  `);

  const historial = db.prepare(`
    INSERT INTO trabajo_historial (trabajo_id, estado_anterior, estado_nuevo, usuario_id, nota)
    VALUES (?, NULL, ?, ?, 'Trabajo de ejemplo')
  `);

  for (const t of trabajosDemo) {
    const info = insertar.run({ ...t, usuario_id: admin ? admin.id : null });
    historial.run(info.lastInsertRowid, t.estado, admin ? admin.id : null);
  }

  console.log(`Se crearon ${trabajosDemo.length} trabajos de ejemplo.`);
} else {
  console.log('Ya existen trabajos en la base de datos, no se insertaron datos de ejemplo.');
}

console.log('Listo.');
