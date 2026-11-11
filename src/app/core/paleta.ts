/** Paleta compartida de colores (Chart.js, mapa y leyendas). */

/** Serie profesional azul/teal para gráficas. */
export const SERIE = [
  '#ec1c24',
  '#00897b',
  '#d4a92c',
  '#7b1113',
  '#5e35b1',
  '#00acc1',
  '#43a047',
  '#fb8c00',
];

/** Color HSL distribuido por índice (territorios del mapa). */
export function colorTerritorio(i: number, total: number): string {
  const hue = Math.round((i * 360) / Math.max(total, 1)) % 360;
  return `hsl(${hue} 62% 48%)`;
}
