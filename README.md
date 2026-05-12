# ISLANEGRA

Webapp premium para un establecimiento de smashed burgers. Tres interfaces:

- **Cliente** (`/menu?mesa=N`) — los comensales piden desde la mesa escaneando un QR.
- **Cocina** (`/cocina`) — staff gestiona las comandas en tiempo real.
- **Negocio** (`/negocio`) — Juan, Mauricio y Sebastián ven KPIs, analytics, pedidos y liquidaciones mensuales.

Stack: **React 18 + Vite + TypeScript + Tailwind + React Router + Supabase + Recharts**.

> Para contexto de producto, modelo de negocio y decisiones de diseño, leer [`CLAUDE.md`](./CLAUDE.md). Este README cubre solo el setup técnico.

---

## 1. Quickstart local

### Requisitos

- Node.js 20+
- Cuenta de Supabase con un proyecto creado
- npm (incluido con Node)

### Pasos

```bash
git clone https://github.com/mausawicki7/islanegra-app.git
cd islanegra-app
npm install
cp .env.example .env.local       # luego editar con tus credenciales (ver sección 2)
npm run dev
```

Abrir http://localhost:5173/menu?mesa=12

---

## 2. Variables de entorno

Crear `.env.local` (nunca commitear; ya está en `.gitignore`):

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_XXXXXXXXXXXXXXXXXXXXXXXX
VITE_TRANSFER_ALIAS=islanegra.mp
VITE_KITCHEN_PIN=1234

# Solo para correr scripts admin (seed de usuarios). NUNCA exponer al cliente.
SUPABASE_SECRET_KEY=sb_secret_XXXXXXXXXXXXXXXXXXXXXXXX
SUPABASE_PROJECT_REF=YOUR-PROJECT-REF
```

Dónde encontrarlas en el dashboard de Supabase:

| Variable | Settings → |
|---|---|
| `VITE_SUPABASE_URL` | API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | API → API Keys → publishable (o anon legacy) |
| `SUPABASE_SECRET_KEY` | API → API Keys → secret (o service_role legacy) |

---

## 3. Setup de la base de datos

### 3.1 Correr las migraciones

Las migraciones están en `supabase/migrations/` y se aplican en orden cronológico (timestamp en el nombre). Hay dos formas:

**Opción A — Supabase CLI (recomendado para múltiples ambientes)**

```bash
npx supabase link --project-ref $SUPABASE_PROJECT_REF
npx supabase db push
```

**Opción B — SQL Editor del dashboard**

Abrir cada archivo en orden y pegarlo en SQL Editor → Run. Orden:

1. `20260511000000_init.sql` — tablas core + RLS anon
2. `20260512000000_kitchen.sql` — policies update + realtime
3. `20260513000000_business.sql` — profiles + roles + RLS dashboard
4. `20260513010000_fix_profiles_recursion.sql` — fix de recursión en policies de profiles
5. `20260514000000_partners.sql` — partners, settlements, payouts + seed de socios

### 3.2 Crear los usuarios del dashboard

Los tres usuarios (Juan, Mauricio, Sebastián) se crean vía el script de seed con la **secret key** (NUNCA desde el navegador):

```bash
npx tsx supabase/seed/create-users.ts
```

Crea/upsertea:

| Email | Rol | Password inicial |
|---|---|---|
| `juan@islanegra.com.ar` | `owner` | `islanegra2026` |
| `mauricio@islanegra.com.ar` | `partner` | `islanegra2026` |
| `sebastian@islanegra.com.ar` | `partner` | `islanegra2026` |

El script es idempotente: re-correrlo es seguro. **Cambiar las contraseñas tras el primer login.**

### 3.3 Verificación

- http://localhost:5173/menu?mesa=12 — pedir una burger
- http://localhost:5173/cocina — PIN `1234`, avanzar el pedido hasta `delivered`
- http://localhost:5173/negocio — login con `juan@islanegra.com.ar` / `islanegra2026`, ver el KPI poblado

---

## 4. Scripts

```bash
npm run dev         # dev server en http://localhost:5173
npm run build       # tsc + vite build → dist/
npm run preview     # sirve el build de producción localmente
npm run typecheck   # tsc -b --noEmit
```

Scripts auxiliares:

```bash
node scripts/convert-burgers.mjs       # optimiza PNGs a WebP 800x800 en public/burgers/
npx tsx supabase/seed/create-users.ts  # crea usuarios y profiles del dashboard
```

---

## 5. Deploy

La app es un SPA estático. Cualquier hosting que sirva archivos estáticos con fallback a `index.html` sirve.

### 5.1 Vercel (recomendado)

1. Importar el repo desde el dashboard de Vercel.
2. Framework preset: **Vite**.
3. Cargar las env vars de la sección 2 en Project Settings → Environment Variables. **Solo las `VITE_*` se exponen al cliente.** No subir `SUPABASE_SECRET_KEY` al ambiente de producción del cliente — la secret solo se usa para el seed que corre localmente.
4. Deploy.

### 5.2 Netlify

1. Build command: `npm run build`
2. Publish directory: `dist`
3. Agregar archivo `_redirects` con `/* /index.html 200` (Netlify lo detecta solo para Vite, pero por las dudas).
4. Cargar env vars como en Vercel.

### 5.3 Self-hosted (Caddy / nginx)

Servir `dist/` como sitio estático con fallback SPA. Ejemplo Caddy:

```
islanegra.com.ar {
  root * /var/www/islanegra/dist
  try_files {path} /index.html
  file_server
  encode gzip zstd
}
```

### 5.4 Dominio + QR para la mesa

- Apuntar `islanegra.com.ar` al hosting.
- Generar QRs con la URL `https://islanegra.com.ar/menu?mesa=N` reemplazando `N` por el número de mesa.
- Imprimir y plastificar.

---

## 6. Antes de producción — checklist de seguridad

- [ ] Cambiar `VITE_KITCHEN_PIN` por uno no obvio.
- [ ] Cambiar las contraseñas iniciales de los 3 usuarios desde Supabase Dashboard → Authentication.
- [ ] Revisar policies de RLS en Supabase Dashboard → Authentication → Policies. Asegurarse que no quedaron policies permisivas de testing.
- [ ] La policy `orders_anon_update` (24h) sigue siendo temporal — antes de prod, restringir a usuarios con rol `kitchen` y eliminar la ventana anon.
- [ ] Configurar dominio HTTPS.
- [ ] Setear `VITE_TRANSFER_ALIAS` al alias real del banco/MP.

---

## 7. Estructura del repo

```
.
├── public/                # estáticos servidos en raíz (favicon, fotos de burgers)
├── scripts/               # utilidades (image pipeline, etc.)
├── src/
│   ├── assets/            # logo SVG
│   ├── components/        # UI (layout, menu, order, kitchen, business)
│   ├── data/              # data estática (burgers)
│   ├── hooks/             # hooks compartidos
│   ├── pages/             # entry points por ruta
│   ├── services/          # capa de acceso a Supabase
│   ├── types/             # tipos compartidos
│   ├── utils/             # helpers puros (formateo, fechas, CSV, audio)
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
└── supabase/
    ├── migrations/        # SQL versionado
    └── seed/              # scripts de seed (corren con secret key)
```

Detalle por feature en [`CLAUDE.md`](./CLAUDE.md), sección 3.

---

## 8. Soporte / sugerencias

`mau.sawicki@gmail.com` (link en el footer de la app).
