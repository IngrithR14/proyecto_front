import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/** Tarjeta KPI reutilizable (Inicio, EDA, MonteCarlo…). */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [MatIconModule, RouterLink],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss',
})
export class KpiCardComponent {
  @Input({ required: true }) etiqueta = '';
  @Input({ required: true }) valor = '';
  @Input() subtitulo = '';
  @Input() icono = 'insights';
  @Input() enlace: string | null = null;
  @Input() tono: 'primario' | 'exito' | 'alerta' | 'neutro' = 'primario';
}
