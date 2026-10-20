/** Paleta compartida de colores (Chart.js, mapa y leyendas). */

export interface ColorCat {
  label: string;
  color: string;
}

export const COLORES_CATEGORIA: Record<string, string> = {
  Tiendas: '#1e88e5',
  Bodegas: '#00897b',
  Entretenimiento: '#f4511e',
  Otros: '#8e24aa',
};

export const COLOR_DEFAULT = '#90a4ae';

/** Serie profesional azul/teal para gráficas. */
export const SERIE = [
  '#1e88e5',
  '#00897b',
  '#f9a825',
  '#e53935',
  '#5e35b1',
  '#00acc1',
  '#43a047',
  '#fb8c00',
];

export function colorPorCategoria(cat: string): string {
  return COLORES_CATEGORIA[cat] ?? COLOR_DEFAULT;
}

/** Color HSL distribuido por índice (territorios del mapa). */
export function colorTerritorio(i: number, total: number): string {
  const hue = Math.round((i * 360) / Math.max(total, 1)) % 360;
  return `hsl(${hue} 62% 48%)`;
}

/** Interpolación lineal entre dos colores hexadecimales. */
export function interpolar(a: string, b: string, t: number): string {
  const pa = hexRgb(a);
  const pb = hexRgb(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${mix(pa[0], pb[0])}, ${mix(pa[1], pb[1])}, ${mix(pa[2], pb[2])})`;
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/**
 * Color divergente rojo–blanco–azul centrado en 0 (Pearson).
 */
export function colorDivergente(v: number, maxAbs = 1): string {
  const t = Math.min(Math.abs(v) / (maxAbs || 1), 1);
  const base = v < 0 ? '#2f6fb2' : '#d64545';
  return interpolar('#ffffff', base, t);
}

/**
 * Escala secuencial "YlOrRd".
 */
export function colorYlOrRd(v: number, max = 1): string {
  const t = Math.max(0, Math.min(1, v / (max || 1)));
  if (t < 0.5) return interpolar('#ffffcc', '#fd8d3c', t / 0.5);
  return interpolar('#fd8d3c', '#b10026', (t - 0.5) / 0.5);
}

/**
 * Escala secuencial azul.
 */
export function colorAzul(v: number, max = 1): string {
  const t = Math.max(0, Math.min(1, v / (max || 1)));
  if (t < 0.5) return interpolar('#f7fbff', '#6baed6', t / 0.5);
  return interpolar('#6baed6', '#08306b', (t - 0.5) / 0.5);
}

/** Texto blanco sobre fondos intensos. */
export function textoSobre(color: string): string {
  const m = color.match(/\d+/g);
  if (!m) return '#111';
  const [r, g, b] = m.map(Number);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#1c1c1e' : '#ffffff';
}
