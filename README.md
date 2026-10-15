# Caon Print Tracker

Aplicacion para **registrar, organizar y hacer seguimiento de trabajos de impresion 3D**,
desde que un cliente solicita una pieza hasta que se le entrega.

- **Backend:** Node.js + Express + SQLite (modulo nativo `node:sqlite`, sin dependencias
  que requieran compilacion)
- **Frontend:** HTML + CSS + JavaScript "vanilla", separados en archivos independientes
  (sin frameworks, sin bundlers), con estilo **neobrutalista**
- **Autenticacion:** login con usuarios y roles (`admin` / `operador`) mediante JWT

---

## 1. Por que SQLite

Para este tipo de proyecto (un taller / makerspace / negocio pequeño-mediano que
lleva el control de sus propios trabajos de impresion) **SQLite es la opcion recomendada**:

- **Cero configuracion**: es un solo archivo (`data/caon.sqlite`), no hay que instalar
  ni administrar un servidor de base de datos aparte.
- **Suficiente para el volumen de datos**: cientos de miles de trabajos no son problema
  para SQLite en un disco normal.
- **Respaldo trivial**: copiar ese archivo es tu backup completo.
- **Rapido para lecturas/escrituras locales**, que es el patron de uso de esta app
  (una o pocas personas operando el taller).
- **Migrable**: si el proyecto crece y necesitas multiples servidores o mucha concurrencia
  de escritura, el modelo relacional (tablas `clientes`, `impresoras`, `trabajos`,
  `trabajo_historial`, `usuarios`) se traslada practicamente igual a **PostgreSQL** el
  dia que haga falta.

Si en el futuro varias personas van a escribir sobre la base de datos **al mismo tiempo
desde distintos servidores**, o necesitas acceso remoto concurrente pesado, la migracion
natural es **PostgreSQL**. Para un solo servidor Express sirviendo a un taller, SQLite es
la eleccion mas simple y robusta.

---

## 2. Estructura del proyecto

```
proyecto caon/
├── server.js                     # Punto de entrada del servidor
├── package.json
├── .env.example                  # Variables de entorno de ejemplo
├── data/                         # Se crea sola: aqui vive el archivo .sqlite
├── src/
│   ├── app.js                    # Configuracion de Express (middlewares, rutas)
│   ├── config/
│   │   └── config.js             # Lectura de variables de entorno
│   ├── db/
│   │   ├── database.js           # Conexion SQLite + creacion de tablas + admin inicial
│   │   └── seed.js               # Datos de ejemplo opcionales (npm run seed)
│   ├── middleware/
│   │   ├── auth.middleware.js    # Verificacion de JWT y de roles
│   │   └── error.middleware.js   # Manejo centralizado de errores
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── usuarios.controller.js
│   │   ├── clientes.controller.js
│   │   ├── impresoras.controller.js
│   │   ├── trabajos.controller.js
│   │   └── dashboard.controller.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   ├── usuarios.routes.js
│   │   ├── clientes.routes.js
│   │   ├── impresoras.routes.js
│   │   ├── trabajos.routes.js
│   │   └── dashboard.routes.js
│   └── utils/
│       ├── jwt.js
│       ├── asyncHandler.js
│       └── ApiError.js
└── public/                       # Frontend estatico servido por Express
    ├── index.html                # App principal (protegida)
    ├── login.html                # Pantalla de login
    ├── css/
    │   └── style.css             # Todo el diseño neobrutalista
    └── js/
        ├── api.js                # Cliente HTTP + manejo de sesion (JWT)
        ├── utils.js               # Helpers: toasts, modal, formateo, etiquetas
        ├── login.js
        ├── app.js                 # Bootstrap de la SPA (navegacion, sidebar)
        ├── dashboard.js
        ├── trabajos.js
        ├── clientes.js
        ├── impresoras.js
        └── usuarios.js
```

Cada seccion (trabajos, clientes, impresoras, usuarios, dashboard) tiene su **propio**
archivo `.js`, y todo el HTML/CSS/JS esta separado en archivos distintos, como pediste.

---

## 3. Modelo de datos

- **usuarios**: cuentas de acceso (`admin` gestiona todo incl. usuarios; `operador`
  gestiona clientes, impresoras y trabajos).
- **clientes**: quien solicita las piezas.
- **impresoras**: el parque de maquinas (`disponible`, `ocupada`, `mantenimiento`,
  `fuera_de_servicio`).
- **trabajos**: el nucleo de la app. Cada trabajo tiene un `codigo` autogenerado
  (`TRB-0001`, `TRB-0002`, ...), cliente, impresora opcional, material, color,
  cantidad, prioridad, fechas (solicitud / entrega estimada / entrega real), costo,
  peso, horas estimadas y un **estado**:

  ```
  pendiente → en_cola → imprimiendo → post_procesado → listo_entrega → entregado
                                                                     ↘ cancelado
  ```

- **trabajo_historial**: registra automaticamente cada cambio de estado (quien,
  cuando y con que nota), para tener trazabilidad completa del ciclo de vida del
  trabajo.

---

## 4. Instalar y ejecutar

Esta maquina no tiene Node.js instalado todavia, asi que antes de correr el proyecto
necesitas instalarlo:

1. Descarga e instala **Node.js LTS** desde https://nodejs.org (elige la version
   "LTS" para Windows). Esto instala automaticamente `npm`.
2. Cierra y vuelve a abrir la terminal para que reconozca los comandos `node` y `npm`.
3. Verifica la instalacion:
   ```powershell
   node -v
   npm -v
   ```

### Pasos del proyecto

```powershell
# 1. Instalar dependencias
npm install

# 2. Crear tu archivo de variables de entorno
copy .env.example .env

# 3. (Opcional) revisar/editar .env: puerto, secreto de JWT, credenciales
#    del admin inicial

# 4. Levantar el servidor en modo desarrollo (recarga automatica)
npm run dev

# —o en modo normal—
npm start

# 5. (Opcional) cargar datos de ejemplo para probar la app
npm run seed
```

Abre el navegador en **http://localhost:3000**.

La primera vez que arranca el servidor, si no hay ningun usuario en la base de datos,
se crea automaticamente un **administrador** con los datos de tu `.env`
(por defecto `admin@caon.local` / `admin1234` — el password se imprime tambien en la
consola). Inicia sesion con esas credenciales y luego crea el resto de usuarios desde
la seccion **Usuarios**.

> La base de datos usa el modulo `node:sqlite`, que viene incluido en Node.js desde
> la version 22.5 (no requiere compilar nada ni instalar Python/Visual Studio Build
> Tools). Por eso se pide Node **>= 22.5.0** en `package.json` — con Node LTS actual
> (22 o superior) funciona sin configuracion adicional.

---

## 5. API (resumen)

Todas las rutas (excepto `/api/auth/login`) requieren el header
`Authorization: Bearer <token>`.

| Metodo | Ruta                              | Descripcion                              | Rol requerido |
|--------|------------------------------------|-------------------------------------------|----------------|
| POST   | `/api/auth/login`                  | Inicia sesion, devuelve token + usuario   | Publico        |
| GET    | `/api/auth/me`                     | Usuario autenticado actual                | Cualquiera     |
| POST   | `/api/auth/cambiar-password`       | Cambia tu propia contraseña               | Cualquiera     |
| GET/POST/PUT/DELETE | `/api/usuarios`, `/api/usuarios/:id` | Gestion de cuentas               | `admin`        |
| GET/POST/PUT/DELETE | `/api/clientes`, `/api/clientes/:id` | CRUD de clientes                 | Cualquiera     |
| GET/POST/PUT/DELETE | `/api/impresoras`, `/api/impresoras/:id` | CRUD de impresoras           | Cualquiera     |
| GET/POST/PUT/DELETE | `/api/trabajos`, `/api/trabajos/:id` | CRUD de trabajos                 | Cualquiera     |
| PATCH  | `/api/trabajos/:id/estado`         | Cambia el estado y registra el historial  | Cualquiera     |
| GET    | `/api/dashboard/stats`             | Estadisticas para el dashboard            | Cualquiera     |

`GET /api/trabajos` acepta filtros por query string: `estado`, `prioridad`,
`cliente_id`, `impresora_id`, `q` (busqueda por pieza/codigo/cliente) y
`atrasados=true`.

---

## 6. Buscador de modelos 3D

Al crear o editar un trabajo, el boton **"🔍 Buscar modelo 3D"** abre un buscador nativo
que consulta la API publica de **Thingiverse** (modelos 3D gratuitos). Al elegir un
resultado se completa automaticamente el nombre de la pieza, el link de referencia
(`archivo_referencia`) y una miniatura del modelo (`imagen_modelo`), que tambien se ve
en el detalle del trabajo.

Para activarlo:

1. Crea una app gratuita en <https://www.thingiverse.com/apps/create>.
2. Copia el **App Token** que te genera.
3. Pegalo en tu `.env` como `THINGIVERSE_ACCESS_TOKEN=...` y reinicia el servidor.

Sin ese token configurado, el resto de la app funciona normalmente; el buscador solo
muestra un aviso pidiendo configurarlo. La referencia que se guarda es un link a la
pagina del modelo en Thingiverse, no el archivo STL en si — la idea es que el operador
lo descargue desde ahi cuando vaya a imprimir, igual que si hubiera pegado el link a mano.

---

## 7. Estilo neobrutalista

El diseño (`public/css/style.css`) sigue las convenciones tipicas del neobrutalismo:
bordes negros gruesos, sombras solidas desplazadas (sin difuminado), colores
saturados (amarillo, rosa, cian, lima, naranja) sobre fondo crema con textura de
puntos, tipografia bold en mayusculas para titulos, y botones con efecto de
"presionado" al hacer click (`translate` + reduccion de sombra).
