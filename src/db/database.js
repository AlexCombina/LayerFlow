const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const config = require('../config/config');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'caon.sqlite');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function crearEsquema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK (rol IN ('admin', 'operador')) DEFAULT 'operador',
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT,
      telefono TEXT,
      notas TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS impresoras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      modelo TEXT,
      estado TEXT NOT NULL CHECK (estado IN ('disponible', 'ocupada', 'mantenimiento', 'fuera_de_servicio')) DEFAULT 'disponible',
      notas TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trabajos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
      impresora_id INTEGER REFERENCES impresoras(id) ON DELETE SET NULL,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      pieza TEXT NOT NULL,
      descripcion TEXT,
      material TEXT,
      color TEXT,
      cantidad INTEGER NOT NULL DEFAULT 1,
      prioridad TEXT NOT NULL CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')) DEFAULT 'media',
      estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'en_cola', 'imprimiendo', 'post_procesado', 'listo_entrega', 'entregado', 'cancelado')) DEFAULT 'pendiente',
      fecha_solicitud TEXT NOT NULL,
      fecha_estimada_entrega TEXT,
      fecha_entrega_real TEXT,
      peso_gramos REAL,
      horas_estimadas REAL,
      costo REAL,
      archivo_referencia TEXT,
      imagen_modelo TEXT,
      notas TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trabajo_historial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trabajo_id INTEGER NOT NULL REFERENCES trabajos(id) ON DELETE CASCADE,
      estado_anterior TEXT,
      estado_nuevo TEXT NOT NULL,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      nota TEXT,
      fecha TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_trabajos_estado ON trabajos(estado);
    CREATE INDEX IF NOT EXISTS idx_trabajos_cliente ON trabajos(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_trabajos_impresora ON trabajos(impresora_id);
    CREATE INDEX IF NOT EXISTS idx_historial_trabajo ON trabajo_historial(trabajo_id);
  `);
}

function migrarEsquema() {
  const columnas = db.prepare('PRAGMA table_info(trabajos)').all().map((c) => c.name);
  if (!columnas.includes('imagen_modelo')) {
    db.exec('ALTER TABLE trabajos ADD COLUMN imagen_modelo TEXT');
  }
}

function sembrarAdmin() {
  const total = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get().total;
  if (total === 0) {
    const hash = bcrypt.hashSync(config.admin.password, 10);
    db.prepare(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
       VALUES (?, ?, ?, 'admin', 1)`
    ).run(config.admin.nombre, config.admin.email.toLowerCase(), hash);

    console.log('----------------------------------------------------');
    console.log('Usuario administrador creado automaticamente:');
    console.log(`  Email:    ${config.admin.email}`);
    console.log(`  Password: ${config.admin.password}`);
    console.log('Cambia esta contraseña despues de iniciar sesion.');
    console.log('----------------------------------------------------');
  }
}

function inicializarBaseDeDatos() {
  crearEsquema();
  migrarEsquema();
  sembrarAdmin();
}

module.exports = { db, inicializarBaseDeDatos };
