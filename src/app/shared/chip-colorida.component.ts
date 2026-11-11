import { Component, Input } from '@angular/core';

/** Chip de color para estados (factible / no factible / supuesto / calibrado). */
@Component({
  selector: 'app-chip-colorida',
  standalone: true,
  template: `
    <span class="chip" [style.background]="fondo" [style.color]="texto">
      <span class="punto" [style.background]="punto"></span>{{ texto_ }}
    </span>
  `,
  styles: [
    `
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.2px;
        white-space: nowrap;
      }
      .punto {
        width: 7px;
        height: 7px;
        border-radius: 50%;
      }
    `,
  ],
})
export class ChipColoridaComponent {
  @Input() texto_ = '';
  @Input() tono: 'exito' | 'alerta' | 'info' | 'neutro' | 'primario' | 'ambar' = 'neutro';

  get fondo(): string {
    switch (this.tono) {
      case 'exito':
        return '#e3f2e6';
      case 'alerta':
        return '#fdecea';
      case 'info':
        return '#fdf3d9';
      case 'ambar':
        return '#f6ecc9';
      case 'primario':
        return '#fdecec';
      default:
        return '#eceff1';
    }
  }

  get texto(): string {
    switch (this.tono) {
      case 'exito':
        return '#2e7d32';
      case 'alerta':
        return '#c62828';
      case 'info':
        return '#7a5b00';
      case 'ambar':
        return '#6f5100';
      case 'primario':
        return '#b3121a';
      default:
        return '#546e7a';
    }
  }

  /** Punto del chip: en ámbar usa el color de marca (#D4A92C); en el resto, el texto. */
  get punto(): string {
    return this.tono === 'ambar' ? '#d4a92c' : this.texto;
  }
}
