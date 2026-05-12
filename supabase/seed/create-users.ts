/**
 * Seed para los usuarios del Turno 3.
 *
 * Crea:
 *   - juan@islanegra.com.ar       (owner)
 *   - mauricio@islanegra.com.ar   (partner)
 *   - sebastian@islanegra.com.ar  (partner)
 *
 * Password inicial: "islanegra2026" (los 3 deberían cambiarla al primer login).
 *
 * Requiere las siguientes env vars en `.env.local`:
 *   - VITE_SUPABASE_URL
 *   - SUPABASE_SECRET_KEY  (NO el publishable, debe ser el service_role/secret)
 *
 * Uso:
 *   npx tsx supabase/seed/create-users.ts
 *
 * Es idempotente: si un usuario ya existe, actualiza su profile en lugar de
 * tirar error.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface UserSeed {
  email: string;
  password: string;
  role: 'owner' | 'partner' | 'kitchen';
}

const USERS: UserSeed[] = [
  { email: 'juan@islanegra.com.ar',      password: 'islanegra2026', role: 'owner'   },
  { email: 'mauricio@islanegra.com.ar',  password: 'islanegra2026', role: 'partner' },
  { email: 'sebastian@islanegra.com.ar', password: 'islanegra2026', role: 'partner' },
];

function loadDotEnv(file: string): Record<string, string> {
  try {
    const raw = readFileSync(resolve(file), 'utf8');
    const out: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^"|"$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...loadDotEnv('.env.local'), ...process.env };
const url = env.VITE_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.error(
    '[seed] Faltan VITE_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local',
  );
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function upsertUser(seed: UserSeed): Promise<string> {
  // Try to create; if it already exists, look it up by email instead.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: seed.email,
    password: seed.password,
    email_confirm: true,
  });

  if (created?.user) {
    console.log(`  ✓ creado: ${seed.email}`);
    return created.user.id;
  }

  if (createErr && !/already|registered|exists/i.test(createErr.message)) {
    throw createErr;
  }

  // Find existing user.
  // listUsers returns paginated results; for 3 users a single page is enough.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) throw listErr;
  const found = list.users.find((u) => u.email === seed.email);
  if (!found) throw new Error(`No se pudo crear ni encontrar ${seed.email}`);
  console.log(`  • ya existía: ${seed.email}`);
  return found.id;
}

async function upsertProfile(userId: string, seed: UserSeed) {
  const { error } = await admin
    .from('profiles')
    .upsert(
      { id: userId, email: seed.email, role: seed.role, active: true },
      { onConflict: 'id' },
    );
  if (error) throw error;
}

async function main() {
  console.log('Seed de usuarios ISLANEGRA →', url);
  for (const seed of USERS) {
    const id = await upsertUser(seed);
    await upsertProfile(id, seed);
    console.log(`    profile ${seed.role} listo (${id})`);
  }
  console.log('Listo. Pueden iniciar sesión en /negocio.');
}

main().catch((err) => {
  console.error('Seed falló:', err);
  process.exit(1);
});
