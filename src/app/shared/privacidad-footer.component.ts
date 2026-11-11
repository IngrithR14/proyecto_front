import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Banner/leyenda de privacidad visible en todas las secciones. */
@Component({
  selector: 'app-privacidad-footer',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="privacidad" role="note">
      <mat-icon>shield_moon</mat-icon>
      <div>
        <strong>Sin datos personales: sólo agregados y coordenadas.</strong>
        <span class="detalle">
          Este dashboard no expone cédulas, nombres de clientes ni direcciones; sólo métricas
          agregadas y puntos geográficos anonimizados. El asistente opera bajo las mismas reglas.
        </span>
      </div>
    </div>
  `,
  styles: [
    `
      .privacidad {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        background: var(--mat-sys-surface-container-low, #f5f7fa);
        border: 1px solid var(--mat-sys-outline-variant, #dfe4ea);
        border-left: 4px solid var(--mat-sys-primary, #ec1c24);
        border-radius: 10px;
        padding: 12px 16px;
        margin: 24px 0 8px;
        font-size: 0.85rem;
        line-height: 1.45;
        color: var(--mat-sys-on-surface-variant);
      }
      mat-icon {
        color: var(--mat-sys-primary);
        flex: 0 0 auto;
      }
      strong {
        display: block;
        color: var(--mat-sys-on-surface);
        margin-bottom: 2px;
      }
    `,
  ],
})
export class PrivacidadFooterComponent {
  @Input() texto = '';
}
