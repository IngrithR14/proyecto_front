import { Component, OnInit, inject, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/api.service';
import {
  fmtDec1,
  fmtEntero,
  fmtPct,
  mensajeError,
} from '../../core/formato';
import { SERIE } from '../../core/paleta';
import type { CargaZona, EdaResumen } from '../../core/models';
import { ChartComponent } from '../../shared/chart.component';
import { KpiCardComponent } from '../../shared/kpi-card.component';
import { CargaEstadoComponent } from '../../shared/carga-estado.component';
import type { ChartConfiguration } from 'chart.js';

interface DistDef {
  clave: string;
  titulo: string;
  icono: string;
  nota: string;
}

@Component({
  selector: 'app-eda',
  standalone: true,
  imports: [
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    ChartComponent,
    KpiCardComponent,
    CargaEstadoComponent,
  ],
  templateUrl: './eda.component.html',
  styleUrl: './eda.component.scss',
})
export class EdaComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly resumen = signal<EdaResumen | null>(null);
  readonly cargaZona = signal<CargaZona | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly fmtEntero = fmtEntero;
  readonly fmtDec1 = fmtDec1;
  readonly fmtPct = fmtPct;

  readonly distribuciones: DistDef[] = [
    {
      clave: 'categoria_actividad',
      titulo: 'Categoría de actividad',
      icono: 'storefront',
      nota: 'Segmentación comercial del cliente.',
    },
    {
      clave: 'departamento',
      titulo: 'Departamento',
      icono: 'map',
      nota: 'Cundinamarca y Boyacá.',
    },
    {
      clave: 'periodo_rep',
      titulo: 'Frecuencia de visitas',
      icono: 'date_range',
      nota: 'Mes completo, 1.ª o 2.ª quincena (según FRE_REP).',
    },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  /** Carga el resumen EDA; si falla deja el mensaje en `error`. */
  cargar(): void {
    this.cargando.set(true);
    this.api.edaResumen().subscribe({
      next: (r) => {
        this.resumen.set(r);
        this.error.set(null);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err));
        this.cargando.set(false);
      },
    });

    this.api.cargaZona().subscribe({
      next: (c) => this.cargaZona.set(c),
      error: () => this.cargaZona.set(this.resumen()?.carga_zona ?? null),
    });
  }

  /** Botón "Reintentar" del estado de error. */
  reintentar(): void {
    this.cargar();
  }

  /* ---------------- KPIs ---------------- */

  get kpis() {
    return (
      this.resumen()?.kpis ?? {
        n_clientes: 0,
        n_zonas: 0,
        visitas_mes_rep: 0,
        visitas_por_dia: 0,
        activos: 0,
        pct_activos: 0,
        falsos_inactivos: 0,
        es_rural: 0,
        sucursales: 0,
      }
    );
  }

  /* ---------------- Distribuciones ---------------- */

  dist(clave: string) {
    return this.resumen()?.distribuciones?.[clave] ?? null;
  }

  chartDist(clave: string): ChartConfiguration<'bar'> {
    const d = this.dist(clave);
    const labels = d?.labels ?? [];
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Clientes',
            data: d?.values ?? [],
            backgroundColor: labels.map((_l, i) => SERIE[i % SERIE.length]),
            borderRadius: 4,
          },
        ],
      },
      options: {
        layout: { padding: { top: 22 } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#eef2f5' }, ticks: { font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 35 } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pct = d?.pct?.[ctx.dataIndex] ?? 0;
                return `${fmtEntero(ctx.parsed.y)} clientes · ${fmtPct(pct / 100)}`;
              },
            },
          },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#37474f',
            font: { size: 9 },
            formatter: (v: number, ctx: any) => {
              const pct = d?.pct?.[ctx.dataIndex] ?? 0;
              return `${fmtEntero(v)} (${fmtPct(pct / 100, 0)})`;
            },
          },
        },
      },
    };
  }

  /* ---------------- Histogramas ---------------- */

  hist(clave: string) {
    return this.resumen()?.histogramas?.[clave] ?? null;
  }

  chartHist(clave: string): ChartConfiguration<'bar'> {
    const h = this.hist(clave);
    const bins = h?.bins ?? [];
    const counts = h?.counts ?? [];
    const etiquetas =
      bins.length === counts.length
        ? bins.map((b) => fmtDec1(b))
        : bins.slice(0, counts.length).map((b, i) => fmtDec1((b + bins[i + 1]) / 2));
    return {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: 'Frecuencia',
            data: counts,
            backgroundColor: '#ec1c24',
            borderRadius: 2,
            barPercentage: 1,
            categoryPercentage: 0.95,
          },
        ],
      },
      options: {
        scales: {
          y: { beginAtZero: true, grid: { color: '#eef2f5' }, ticks: { font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 60 } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => `Clase: ${items[0]?.label}`,
              label: (ctx) => `${fmtEntero(ctx.parsed.y)} clientes`,
            },
          },
        },
      },
    };
  }

  /* ---------------- Carga por zona ---------------- */

  chartCarga(): ChartConfiguration<'bar'> {
    const filas = this.filasCarga;
    return {
      type: 'bar',
      data: {
        labels: filas.map((f) => f.zona),
        datasets: [
          {
            label: 'Clientes',
            data: filas.map((f) => f.clientes),
            backgroundColor: '#d4a92c',
            borderRadius: 4,
            categoryPercentage: 0.85,
            barPercentage: 0.9,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#eef2f5' },
            ticks: { font: { size: 10 } },
            title: { display: true, text: 'Clientes', font: { size: 10 } },
          },
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: 60,
              minRotation: 60,
              font: { size: 8 },
            },
          },
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const f = filas[items[0]?.dataIndex ?? 0];
                if (!f) return '';
                return `${f.zona} · visitas/mes: ${fmtEntero(f.vm)} · activos: ${fmtEntero(f.activos)}`;
              },
            },
          },
        },
      },
    };
  }

  get filasCarga(): { zona: string; clientes: number; activos: number; vm: number; vd: number }[] {
    const c = this.cargaZona();
    if (!c) return [];
    return c.zonas
      .map((z, i) => ({
        zona: z,
        clientes: c.clientes[i] ?? 0,
        activos: c.activos[i] ?? 0,
        vm: c.visitas_mes_rep[i] ?? 0,
        vd: c.visitas_dia[i] ?? 0,
      }))
      // Orden: de mayor a menor número de clientes.
      .sort((a, b) => b.clientes - a.clientes);
  }

  /* ---------------- Correlaciones ---------------- */

  get correlaciones() {
    return (
      this.resumen()?.correlaciones ?? {
        pearson: { index: [], columns: [], matriz: [] },
        pearson_pares: [],
        cramers_v: { index: [], columns: [], matriz: [] },
        eta: { index: [], columns: [], matriz: [] },
      }
    );
  }
}
