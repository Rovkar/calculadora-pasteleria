import { MAX_INSUMOS, MAX_PRODUCTS, normalizeAppData } from '../../store/normalize';
import type { AppData } from '../../store/types';

export const BACKUP_APP = 'calculadora-pasteleria';
export const BACKUP_VERSION = 1;

export function buildBackup(data: AppData, now: Date = new Date()): string {
  return JSON.stringify({ app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data }, null, 2);
}

export function backupFileName(now: Date = new Date(), prefix = 'respaldo-precios'): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

export type BackupResult = { ok: true; data: AppData } | { ok: false; error: string };

/** A backup file is a few hundred KB at most; anything bigger is not ours (and would not fit in localStorage). */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

const BAD_FILE = 'Este archivo no es un respaldo de la calculadora.';

/** Never throws. Strict: products, insumos and settings must be present with the right types. */
export function readBackup(text: string): BackupResult {
  if (typeof text !== 'string' || text.length > MAX_BACKUP_BYTES) {
    return { ok: false, error: 'El archivo es demasiado grande para ser un respaldo de la calculadora.' };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'No se pudo leer el archivo. Elige un respaldo descargado desde esta app.' };
  }
  if (typeof raw !== 'object' || raw === null || (raw as Record<string, unknown>).app !== BACKUP_APP) {
    return { ok: false, error: BAD_FILE };
  }
  const version = (raw as Record<string, unknown>).version;
  if (typeof version === 'number' && version > BACKUP_VERSION) {
    return { ok: false, error: 'Este respaldo viene de una versión más nueva de la app. Actualiza la app e inténtalo de nuevo.' };
  }
  const payload = (raw as Record<string, unknown>).data;
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { ok: false, error: 'El respaldo no contiene datos.' };
  }
  const p = payload as Record<string, unknown>;
  if (
    !Array.isArray(p.products) ||
    !Array.isArray(p.insumos) ||
    typeof p.settings !== 'object' ||
    p.settings === null ||
    Array.isArray(p.settings)
  ) {
    return { ok: false, error: 'El respaldo está incompleto: faltan productos, insumos o ajustes.' };
  }
  if (p.products.length > MAX_PRODUCTS || p.insumos.length > MAX_INSUMOS) {
    return { ok: false, error: 'El respaldo tiene demasiados registros.' };
  }
  // A missing draft / quick calc is not an error, but it must not be filled with the sample data.
  const data = normalizeAppData({ ...p, draft: p.draft ?? null, quick: p.quick ?? null });
  if (!data) return { ok: false, error: 'El respaldo no contiene datos válidos.' };
  return { ok: true, data };
}
