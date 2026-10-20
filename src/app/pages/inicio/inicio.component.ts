import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/api.service';
import { fmtDec1, fmtEntero, fmtPct, mensajeError } from '../../core/formato';
import { SERIE } from '../../core/paleta';
import type { Calendario, Params, Universos } from '../../core/models';
import { ChartComponent } from '../../shared/chart.component';
import { KpiCardComponent } from '../../shared/kpi-card.component';
import { CargaEstadoComponent } from '../../shared/carga-estado.component';
import type { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    RouterLink,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    ChartComponent,
    KpiCardComponent,
    CargaEstadoComponent,
  ],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly universos = signal<Universos | null>(null);
  readonly params = signal<Params | null>(null);
  readonly calendario = signal<Calendario | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly fmtEntero = fmtEntero;
  readonly fmtDec1 = fmtDec1;
  readonly fmtPct = fmtPct;

  ngOnInit(): void {
    this.api.params().subscribe({ next: (p) => this.params.set(p) });
    this.api.calendario().subscribe({ next: (c) => this.calendario.set(c) });
    this.cargar();
  }

  /** Carga el universo de datos; si falla deja el mensaje en `error`. */
  cargar(): void {
    this.cargando.set(true);
    this.api.universos().subscribe({
      next: (u) => {
        this.universos.set(u);
        this.error.set(null);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err));
        this.cargando.set(false);
      },
    });
  }

  /** Botón "Reintentar" del estado de error. */
  reintentar(): void {
    this.cargar();
  }

  get kpis() {
    const u = this.universos();
    const p = this.params();
    return {
      clientes: fmtEntero(u?.n_clientes),
      visitas: fmtEntero(u?.visitas_totales_mes),
      zonasRutable: `${fmtEntero(u?.zonas_rutable)} / ${fmtEntero(u?.zonas_base)}`,
      cap: fmtEntero(p?.cap_dinamico ?? 44),
    };
  }

  /** Barras horizontales del embudo de depuración. */
  get embudoChart(): ChartConfiguration<'bar'> {
    const e = this.universos()?.embudo ?? [];
    return {
      type: 'bar',
      data: {
        labels: e.map((p) => p.paso),
        datasets: [
          {
            label: 'Filas restantes',
            data: e.map((p) => p.filas),
            backgroundColor: SERIE[0],
            borderRadius: 4,
          },
          {
            label: 'Filas eliminadas',
            data: e.map((p) => p.eliminadas),
            backgroundColor: '#e57373',
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        layout: { padding: { right: 34 } },
        scales: {
          x: { grid: { color: '#eef2f5' }, ticks: { font: { size: 10 } } },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const p = e[ctx.dataIndex];
                return p && p.eliminadas ? `Eliminadas: ${fmtEntero(p.eliminadas)}` : '';
              },
            },
          },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'end',
            color: '#37474f',
            font: { size: 10 },
            formatter: (v: number) => (v > 0 ? fmtEntero(v) : ''),
          },
        },
      },
    };
  }

  /** Visitas por día de semana del calendario de referencia. */
  get calendarioChart(): ChartConfiguration<'bar'> {
    const dias = this.calendario()?.resumen?.visitas_por_dia_semana ?? {};
    const orden = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    const claves = orden.filter((d) => d in dias);
    return {
      type: 'bar',
      data: {
        labels: claves.map((d) => d.charAt(0) + d.slice(1).toLowerCase()),
        datasets: [
          {
            label: 'Visitas/día',
            data: claves.map((d) => dias[d]),
            backgroundColor: SERIE[1],
            borderRadius: 5,
          },
        ],
      },
      options: {
        layout: { padding: { top: 22 } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#eef2f5' } },
          x: { grid: { display: false } },
        },
        plugins: {
          legend: { display: false },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'end',
            color: '#37474f',
            font: { size: 10 },
            formatter: (v: number) => fmtEntero(v),
          },
        },
      },
    };
  }
}
