import { Component, OnInit, inject, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/api.service';
import {
  fmtDec1,
  fmtDec2,
  fmtEntero,
  fmtPct,
  mensajeError,
} from '../../core/formato';
import { SERIE, colorPorCategoria } from '../../core/paleta';
import type { CargaZona, EdaResumen } from '../../core/models';
import { ChartComponent } from '../../shared/chart.component';
import { HeatmapComponent } from '../../shared/heatmap.component';
import { MapaLeafletComponent, Leyenda } from '../../shared/mapa-leaflet.component';
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
    HeatmapComponent,
    MapaLeafletComponent,
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
  readonly fmtDec2 = fmtDec2;
  readonly fmtPct = fmtPct;
  readonly colorPorCategoria = colorPorCategoria;

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
      clave: 'dias_rep',
      titulo: 'Días de visita',
      icono: 'calendar_view_week',
      nota: 'Día de la semana en que se hacen las visitas.',
    },
    {
      clave: 'periodo_rep',
      titulo: 'Frecuencia de visitas',
      icono: 'date_range',
      nota: 'Mes completo, 1.ª o 2.ª quincena (según FRE_REP).',
    },
    { clave: 'estrato', titulo: 'Estrato', icono: 'stairs', nota: 'Estrato socioeconómico.' },
  ];

  readonly leyendaScatter: Leyenda = {
    titulo: 'Categoría de actividad',
    items: [
      { label: 'Tiendas', color: colorPorCategoria('Tiendas') },
      { label: 'Bodegas', color: colorPorCategoria('Bodegas') },
      { label: 'Entretenimiento', color: colorPorCategoria('Entretenimiento') },
      { label: 'Otros', color: colorPorCategoria('Otros') },
    ],
  };

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

    this.api.cargaZona(15).subscribe({
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
            backgroundColor: '#4d8fd1',
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
    const c = this.cargaZona();
    return {
      type: 'bar',
      data: {
        labels: c?.zonas ?? [],
        datasets: [
          {
            label: 'Clientes',
            data: c?.clientes ?? [],
            backgroundColor: '#9fc6e8',
            borderRadius: 4,
            yAxisID: 'y',
          },
          {
            label: 'Visitas/día',
            data: c?.visitas_dia ?? [],
            backgroundColor: '#00897b',
            borderRadius: 4,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            position: 'left',
            grid: { color: '#eef2f5' },
            ticks: { font: { size: 10 } },
            title: { display: true, text: 'Clientes', font: { size: 10 } },
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 10 } },
            title: { display: true, text: 'Visitas/día', font: { size: 10 } },
          },
          x: { grid: { display: false }, ticks: { font: { size: 9 } } },
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const i = items[0]?.dataIndex ?? 0;
                const z = c?.zonas?.[i] ?? '';
                return `${z} · visitas/mes: ${fmtEntero(c?.visitas_mes_rep?.[i])} · activos: ${fmtEntero(c?.activos?.[i])}`;
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
    return c.zonas.map((z, i) => ({
      zona: z,
      clientes: c.clientes[i] ?? 0,
      activos: c.activos[i] ?? 0,
      vm: c.visitas_mes_rep[i] ?? 0,
      vd: c.visitas_dia[i] ?? 0,
    }));
  }

  /* ---------------- Mapa ---------------- */

  get puntosMapa() {
    return (this.resumen()?.scatter ?? []).slice(0, 2500).map((p) => ({
      lat: p.lat,
      lon: p.lon,
      t: p.cat,
      meta: p.dep,
    }));
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

  get paresRelevantes() {
    return (this.correlaciones.pearson_pares ?? [])
      .filter((p) => Math.abs(p.r) >= 0.5)
      .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  }

  get crosstabs() {
    return this.resumen()?.crosstabs ?? {};
  }

  get crosstabKeys(): string[] {
    return Object.keys(this.crosstabs);
  }

  tituloCrosstab(clave: string): string {
    const mapa: Record<string, string> = {
      cat_vs_activo: 'Categoría × Activo comercial',
      cat_vs_poblacion: 'Categoría × Tipo de población',
      cat_vs_departamento: 'Categoría × Departamento',
    };
    return mapa[clave] ?? clave;
  }
}
