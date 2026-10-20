import { Component, Input } from '@angular/core';
import { colorAzul, colorDivergente, colorYlOrRd, textoSobre } from '../core/paleta';
import { fmtDec2 } from '../core/formato';

/**
 * Heatmap renderizado como tabla coloreada (interactiva: hover por celda).
 * - `diverging`: rojo–azul centrado en 0 (Pearson).
 * - `yilorrd` / `azul`: escalas secuenciales (Cramér's V, η).
 */
@Component({
  selector: 'app-heatmap',
  standalone: true,
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.scss',
})
export class HeatmapComponent {
  @Input({ required: true }) filas: string[] = [];
  @Input({ required: true }) columnas: string[] = [];
  @Input({ required: true }) matriz: number[][] = [];
  @Input() escala: 'diverging' | 'yilorrd' | 'azul' = 'diverging';
  @Input() maxAbs = 1;

  color(v: number): string {
    switch (this.escala) {
      case 'yilorrd':
        return colorYlOrRd(v, 1);
      case 'azul':
        return colorAzul(v, 1);
      default:
        return colorDivergente(v, this.maxAbs || 1);
    }
  }

  texto(v: number): string {
    return textoSobre(this.color(v));
  }

  valor(v: number | undefined): string {
    return v === undefined || v === null ? '—' : fmtDec2(v);
  }

  get filaLabels(): string[] {
    return this.filas.length ? this.filas : this.matriz.map((_r, i) => `F${i + 1}`);
  }

  get colLabels(): string[] {
    if (this.columnas.length) return this.columnas;
    const n = this.matriz[0]?.length ?? 0;
    return Array.from({ length: n }, (_v, i) => `C${i + 1}`);
  }
}
