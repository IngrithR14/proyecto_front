/** Utilidades de formato numérico (locale es-CO) para todo el dashboard. */

const e0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const e1 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const e2 = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtEntero(v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : e0.format(v);
}

export function fmtDec1(v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : e1.format(v);
}

export function fmtDec2(v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : e2.format(v);
}

/** `0.85` → `85,0 %` */
export function fmtPct(v: number | null | undefined, dec = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const n = dec === 0 ? e0 : dec === 1 ? e1 : e2;
  return `${n.format(v * 100)} %`;
}

/** Millones de COP: `133.32` → `133,32 M COP` */
export function fmtMillones(v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : `${e2.format(v)} M COP`;
}

/** Kilómetros: `24099.9` → `24.100 km` */
export function fmtKm(v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : `${e0.format(v)} km`;
}

/** Diferencia con signo en millones. */
export function fmtDelta(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const signo = v > 0 ? '+' : v < 0 ? '−' : '';
  return `${signo}${e2.format(Math.abs(v))} M`;
}

/** Cuantil simple por interpolación sobre un arreglo ordenado. */
export function cuantil(valores: number[], q: number): number {
  if (!valores.length) return 0;
  const s = [...valores].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const base = Math.floor(pos);
  const resto = pos - base;
  const sig = s[base + 1];
  return sig === undefined ? s[base] : s[base] + resto * (sig - s[base]);
}

export function media(valores: number[]): number {
  if (!valores.length) return 0;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

export function desv(valores: number[]): number {
  if (valores.length < 2) return 0;
  const m = media(valores);
  const varianza = valores.reduce((a, b) => a + (b - m) ** 2, 0) / (valores.length - 1);
  return Math.sqrt(varianza);
}

/** Texto amigable para un error de red/backend. */
export function mensajeError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Error inesperado';
}
