import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { ApiService, BackendNoListoError } from '../../core/api.service';
import {
  fmtDec1,
  fmtDec2,
  fmtDelta,
  fmtEntero,
  fmtKm,
  fmtMillones,
  fmtPct,
  mensajeError,
} from '../../core/formato';
import { SERIE, colorTerritorio } from '../../core/paleta';
import type { ComparacionK, Estrategia, GeoData, MejorEstrategia, MonteCarloTabla } from '../../core/models';
import { ChartComponent } from '../../shared/chart.component';
import { MapaLeafletComponent } from '../../shared/mapa-leaflet.component';
import { KpiCardComponent } from '../../shared/kpi-card.component';
import { ChipColoridaComponent } from '../../shared/chip-colorida.component';
import { CargaEstadoComponent } from '../../shared/carga-estado.component';
import type { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-montecarlo',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatSliderModule,
    MatButtonModule,
    ChartComponent,
    MapaLeafletComponent,
    KpiCardComponent,
    ChipColoridaComponent,
    CargaEstadoComponent,
  ],
  templateUrl: './montecarlo.component.html',
  styleUrl: './montecarlo.component.scss',
})
export class MonteCarloComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly tabla = signal<MonteCarloTabla | null>(null);
  readonly mejor = signal<MejorEstrategia | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly kSel = signal(58);
  readonly kActual = signal(58);
  readonly kMin = signal(35);
  readonly kMax = signal(70);
  readonly capDinamico = signal(44);
  readonly nSim = signal(0);

  readonly cargandoK = signal(false);
  readonly errorK = signal<string | null>(null);

  readonly geo = signal<GeoData | null>(null);
  readonly geoCargando = signal(false);
  readonly geoError = signal<string | null>(null);
  readonly geoNota = signal<string | null>(null);

  readonly fmtEntero = fmtEntero;
  readonly fmtDec1 = fmtDec1;
  readonly fmtDec2 = fmtDec2;
  readonly fmtDelta = fmtDelta;
  readonly fmtKm = fmtKm;
  readonly fmtMillones = fmtMillones;
  readonly fmtPct = fmtPct;
  readonly colorTerritorio = colorTerritorio;

  ngOnInit(): void {
    this.cargar();
  }

  /** Carga inicial o reintento tras un fallo del backend. */
  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.api.mcMejor().subscribe({ next: (m) => this.mejor.set(m) });

    this.api.mcTabla().subscribe({
      next: (t) => {
        this.tabla.set(t);
        this.nSim.set(t.n_sim);
        this.kActual.set(t.actual?.K ?? 58);
        this.kSel.set(t.actual?.K ?? 58);
        this.cargando.set(false);
        this.sincronizarK();
      },
      error: (err) => {
        this.error.set(mensajeError(err));
        this.cargando.set(false);
      },
    });
  }

  reintentar(): void {
    this.cargar();
  }

  /* ---------------- Selector de K ---------------- */

  get ksDisponibles(): number[] {
    const e = this.tabla()?.estrategias ?? {};
    return Object.keys(e)
      .map((k) => Number(k))
      .filter((k) => !Number.isNaN(k))
      .sort((a, b) => a - b);
  }

  setK(k: number): void {
    const v = Math.max(this.kMin(), Math.min(this.kMax(), Math.round(k)));
    if (v === this.kSel()) return;
    this.kSel.set(v);
    this.sincronizarK();
  }

  estrategiaDe(k: number): Estrategia | null {
    const t = this.tabla();
    if (!t) return null;
    // El escenario ACTUAL tiene su propio registro (cacheado) en `actual`.
    if (t.actual && k === t.actual.K) return t.actual;
    return t.estrategias?.[String(k)] ?? null;
  }

  get seleccionada(): Estrategia | null {
    return this.estrategiaDe(this.kSel());
  }

  get comparacionSel() {
    const t = this.tabla();
    if (!t) return null;
    if (this.kSel() === (t.actual?.K ?? 58)) return null; // es el escenario de referencia
    return t.comparaciones?.[String(this.kSel())] ?? null;
  }

  /**
   * Sincroniza el panel de la K seleccionada y el mapa.
   * Si la K no está cacheada aún, consulta el endpoint directo (puede devolver 503).
   */
  private sincronizarK(): void {
    const k = this.kSel();
    if (this.estrategiaDe(k)) {
      this.errorK.set(null);
      this.cargandoK.set(false);
    } else {
      this.cargarEstrategia(k);
    }
    this.cargarGeo(k);
  }

  private cargarEstrategia(k: number): void {
    this.cargandoK.set(true);
    this.errorK.set(null);
    this.api.mcEstrategia(k).subscribe({
      next: () => this.cargandoK.set(false),
      error: (err) => {
        this.cargandoK.set(false);
        this.errorK.set(mensajeError(err));
      },
    });
  }

  get esperandoCalculo(): boolean {
    return !this.seleccionada && (this.cargandoK() || !!this.errorK());
  }

  get mensajeEspera(): string {
    const e = this.errorK();
    return e
      ? `${e}. El simulador sigue trabajando: vuelva a intentarlo en unos minutos.`
      : 'Simulando escenarios… esto puede tardar un par de minutos.';
  }

  /* ---------------- Tabla comparativa ---------------- */

  /**
   * Filas de la tabla comparativa: todas las estrategias simuladas
   * (mapa `estrategias`) más una fila destacada con el escenario ACTUAL
   * (registro cacheado `actual`), que es la línea base de comparación.
   */
  get filasTabla(): { k: number; e: Estrategia; comp: ComparacionK | null; esActual: boolean }[] {
    const t = this.tabla();
    if (!t) return [];
    const kActual = t.actual?.K ?? 58;

    const filas = Object.keys(t.estrategias ?? {})
      .map((k) => Number(k))
      .filter((k) => !Number.isNaN(k))
      .sort((a, b) => a - b)
      .map((k) => ({
        k,
        e: t.estrategias[String(k)],
        comp: k === kActual ? null : (t.comparaciones?.[String(k)] ?? null),
        esActual: false,
      }))
      .filter((f): f is { k: number; e: Estrategia; comp: ComparacionK | null; esActual: boolean } => !!f.e);

    if (t.actual) {
      const i = filas.findIndex((f) => f.k === kActual);
      const filaActual = { k: kActual, e: t.actual, comp: null, esActual: true };
      if (i >= 0) filas.splice(i + 1, 0, filaActual);
      else filas.push(filaActual);
    }
    return filas;
  }

  /**
   * Filas para las gráficas: usa el mapa `estrategias` (serie continua simulada).
   * El escenario ACTUAL se superpone como punto aparte, porque proviene del
   * registro cacheado `actual` y no de la misma corrida de simulación.
   */
  get filasGrafica(): { k: number; e: Estrategia }[] {
    const t = this.tabla();
    if (!t) return [];
    return Object.keys(t.estrategias ?? {})
      .map((k) => Number(k))
      .filter((k) => !Number.isNaN(k))
      .sort((a, b) => a - b)
      .map((k) => ({ k, e: t.estrategias[String(k)] }))
      .filter((f): f is { k: number; e: Estrategia } => !!f.e);
  }

  get kMinimaFactible(): number | null {
    return this.mejor()?.minima_factible ?? null;
  }

  get kMasBarata(): number | null {
    return this.mejor()?.mas_barata_global?.K ?? null;
  }

  get kMejorFactible(): number | null {
    return this.mejor()?.mejor_factible?.K ?? null;
  }

  esFilaDestacada(k: number): boolean {
    return k === this.kMinimaFactible || k === this.kMasBarata || k === this.kMejorFactible;
  }

  /* ---------------- Gráficas ---------------- */

  get costoChart(): ChartConfiguration<'line'> {
    const filas = this.filasGrafica;
    const a = this.tabla()?.actual;
    const idxActual = filas.findIndex((f) => f.k === a?.K);
    const ks = filas.map((f) => f.k);
    return {
      type: 'line',
      data: {
        labels: ks.map((k) => `K=${k}`),
        datasets: [
          {
            label: 'IC95 superior',
            data: filas.map((f) => f.e.ic95_sup),
            borderWidth: 0,
            pointRadius: 0,
            fill: '+1',
            backgroundColor: 'rgba(30, 136, 229, 0.18)',
            tension: 0.25,
          },
          {
            label: 'IC95 inferior',
            data: filas.map((f) => f.e.ic95_inf),
            borderWidth: 0,
            pointRadius: 0,
            fill: false,
            backgroundColor: 'rgba(30, 136, 229, 0.18)',
            tension: 0.25,
          },
          {
            label: 'Costo medio (M COP)',
            data: filas.map((f) => f.e.costo_medio_M),
            borderColor: SERIE[0],
            backgroundColor: SERIE[0],
            pointRadius: filas.map((f) => (f.k === a?.K ? 6 : 3)),
            pointBackgroundColor: filas.map((f) => (f.k === a?.K ? '#e53935' : SERIE[0])),
            borderWidth: 2,
            tension: 0.25,
            fill: false,
          },
          {
            label: `Costo del escenario ACTUAL (K=${a?.K ?? 58})`,
            data: filas.map(() => a?.costo_medio_M ?? 0),
            borderColor: '#e53935',
            borderDash: [6, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
          },
          {
            type: 'scatter',
            label: 'Escenario ACTUAL',
            // la x debe ser la etiqueta de la categoría (Chart.js parsea la x del
            // scatter contra los labels; un número crea una etiqueta nueva en 0)
            data: idxActual >= 0 && a ? [{ x: `K=${a.K}`, y: a.costo_medio_M }] : [],
            backgroundColor: '#e53935',
            borderColor: '#ffffff',
            borderWidth: 2,
            pointRadius: 7,
            pointHoverRadius: 9,
          },
        ] as any[],
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            title: { display: true, text: 'Costo medio por ciclo (M COP)', font: { size: 11 } },
            grid: { color: '#eef2f5' },
          },
          x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 90 } },
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${fmtDec2(ctx.parsed.y)} M COP`,
            },
          },
        },
      },
    };
  }

  get picoChart(): ChartConfiguration<'line'> {
    const filas = this.filasGrafica;
    const a = this.tabla()?.actual;
    const idxActual = filas.findIndex((f) => f.k === a?.K);
    const cap = this.capDinamico();
    return {
      type: 'line',
      data: {
        labels: filas.map((f) => `K=${f.k}`),
        datasets: [
          {
            label: 'Pico de carga (visitas/día)',
            data: filas.map((f) => f.e.pico_carga),
            borderColor: SERIE[1],
            backgroundColor: filas.map((f) =>
              f.e.pico_carga > cap ? '#e53935' : SERIE[1],
            ),
            pointRadius: 4,
            borderWidth: 2,
            tension: 0.2,
            fill: false,
          },
          {
            label: `Máximo diario (${cap})`,
            data: filas.map(() => cap),
            borderColor: '#d4a92c',
            borderDash: [7, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
          },
          {
            type: 'scatter',
            label: 'Escenario ACTUAL',
            data: idxActual >= 0 && a ? [{ x: `K=${a.K}`, y: a.pico_carga }] : [],
            backgroundColor: a && a.pico_carga > cap ? '#e53935' : '#43a047',
            borderColor: '#ffffff',
            borderWidth: 2,
            pointRadius: 7,
            pointHoverRadius: 9,
          },
        ] as any[],
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            title: { display: true, text: 'Visitas por asesor y día', font: { size: 11 } },
            grid: { color: '#eef2f5' },
            suggestedMin: 35,
          },
          x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 90 } },
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const f = filas[items[0]?.dataIndex ?? 0];
                if (!f) return '';
                return f.e.pico_carga > cap
                  ? '⚠ Supera el máximo diario'
                  : '✓ Dentro del máximo diario';
              },
            },
          },
        },
      },
    };
  }

  get costoDesgloseChart(): ChartConfiguration<'doughnut'> {
    const e = this.seleccionada;
    return {
      type: 'doughnut',
      data: {
        labels: ['Costo fijo', 'Combustible', 'Horas extra'],
        datasets: [
          {
            data: [e?.pct_fijo ?? 0, e?.pct_combustible ?? 0, e?.pct_extra ?? 0],
            backgroundColor: [SERIE[0], SERIE[1], SERIE[2]],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: { label: (ctx) => `${ctx.label}: ${fmtDec1(ctx.parsed)} %` },
          },
          datalabels: {
            display: true,
            color: '#ffffff',
            font: { size: 11, weight: 600 },
            formatter: (v: number) => `${fmtDec1(v)}%`,
          },
        },
      },
    };
  }

  /* ---------------- Mapa de territorios ---------------- */

  private cargarGeo(k: number): void {
    this.geoCargando.set(true);
    this.geoError.set(null);
    this.geoNota.set(null);
    this.geo.set(null);

    this.api.geo(k).subscribe({
      next: (g) => {
        this.geo.set(g);
        this.geoCargando.set(false);
      },
      error: (err) => {
        // si la K pedida no está cacheada, intentamos con el escenario ACTUAL
        this.api.geo('actual').subscribe({
          next: (g) => {
            this.geo.set(g);
            this.geoCargando.set(false);
            const nota =
              err instanceof BackendNoListoError
                ? `Geo de K=${k} aún no precalculado: se muestra el escenario ACTUAL (K=${this.kActual()}).`
                : null;
            this.geoNota.set(nota);
          },
          error: (err2) => {
            this.geoCargando.set(false);
            this.geoError.set(mensajeError(err2));
          },
        });
      },
    });
  }

  get leyendaTerritorios() {
    const g = this.geo();
    if (!g) return null;
    return {
      titulo: `Territorios (${g.territorios?.length ?? 0})`,
      items: (g.territorios ?? []).slice(0, 16).map((t, i) => ({
        label: `${t.id} · ${fmtEntero(t.visitas)} visitas`,
        color: colorTerritorio(i, Math.max(g.territorios?.length ?? 1, 1)),
      })),
    };
  }
}
