import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { forkJoin, catchError, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { fmtDec1, fmtDec2, fmtEntero, fmtPct, mensajeError } from '../../core/formato';
import { SERIE } from '../../core/paleta';
import type {
  DimensionEstrategia,
  EvalEstrategias,
  EvalNnVsAco,
  FilaEstrategia,
  ReglasRespuesta,
  RuteoKfold,
  RuteoRutas,
} from '../../core/models';
import { ChartComponent } from '../../shared/chart.component';
import { ChipColoridaComponent } from '../../shared/chip-colorida.component';
import { CargaEstadoComponent } from '../../shared/carga-estado.component';
import { KpiCardComponent } from '../../shared/kpi-card.component';
import type { ChartConfiguration } from 'chart.js';

interface Condicion {
  clave: string;
  etiqueta: string;
  cumple: boolean;
}

interface ValorDim {
  valor: string;
  detalle: string;
}

/** Nombres en lenguaje llano de las 8 dimensiones (sin siglas sueltas). */
const DIMENSIONES: { clave: string; etiqueta: string; umbral: string }[] = [
  {
    clave: 'costo',
    etiqueta: 'Costo total por ciclo',
    umbral: 'IC95 superior del Δcosto < 0 vs ACTUAL',
  },
  { clave: 'eficiencia', etiqueta: 'Distancia recorrida', umbral: '≤ 1,25 × ACTUAL' },
  { clave: 'factibilidad', etiqueta: 'Días sobre el tope de visitas', umbral: '0 días' },
  {
    clave: 'cumplimiento',
    etiqueta: 'Cobertura del plan',
    umbral: 'pérdida ≤ 0,5 puntos porcentuales',
  },
  { clave: 'balance', etiqueta: 'Balance de carga entre asesores', umbral: 'informativa' },
  {
    clave: 'generalizacion',
    etiqueta: 'Generalización (clientes de test)',
    umbral: 'km extra ≤ 5 % y arrepentimiento ≤ 5 %',
  },
  { clave: 'estabilidad', etiqueta: 'Estabilidad entre 3 semillas', umbral: '2 de 3 semillas' },
  { clave: 'compacidad', etiqueta: 'Compacidad (visitas por asesor-día)', umbral: 'informativa' },
];

@Component({
  selector: 'app-ruteo',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    ChartComponent,
    ChipColoridaComponent,
    CargaEstadoComponent,
    KpiCardComponent,
  ],
  templateUrl: './ruteo.component.html',
  styleUrl: './ruteo.component.scss',
})
export class RuteoComponent implements OnInit {
  private readonly api = inject(ApiService);

  /** Sección 2: NN vs ACO por pares de ruta. */
  readonly nnAco = signal<EvalNnVsAco | null>(null);
  /** Sección 3: estrategias contra ACTUAL. */
  readonly estrategias = signal<EvalEstrategias | null>(null);
  /** Las dos reglas de decisión con sus condiciones. */
  readonly reglas = signal<ReglasRespuesta | null>(null);
  readonly kfold = signal<RuteoKfold | null>(null);
  readonly rutas = signal<RuteoRutas | null>(null);
  readonly cap = signal<number | null>(null);
  readonly estrategiaRutas = signal<'recomendada' | 'actual'>('recomendada');
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  /** Avisos no críticos (p.ej. alguna cache sin precalcular). */
  readonly aviso = signal<string | null>(null);

  readonly fmtDec1 = fmtDec1;
  readonly fmtDec2 = fmtDec2;
  readonly fmtEntero = fmtEntero;
  readonly fmtPct = fmtPct;
  readonly dimColumnas = DIMENSIONES;

  ngOnInit(): void {
    this.cargar();
  }

  /**
   * Carga el protocolo de evaluación + validación cruzada + rutas en paralelo.
   * Sólo `params` es crítico: si falla, el backend no está accesible. Lo demás
   * que falte se reporta como aviso (puede estar sin precalcular).
   */
  cargar(): void {
    this.cargando.set(true);
    forkJoin({
      params: this.api.params(),
      nnAco: this.api.evalNnVsAco().pipe(catchError(() => of(null))),
      estrategias: this.api.evalEstrategias().pipe(catchError(() => of(null))),
      reglas: this.api.evalRegla().pipe(catchError(() => of(null))),
      kfold: this.api.ruteoKfold().pipe(catchError(() => of(null))),
      rutas: this.api
        .ruteoRutas(this.estrategiaRutas(), 1)
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ params, nnAco, estrategias, reglas, kfold, rutas }) => {
        this.nnAco.set(nnAco);
        this.estrategias.set(estrategias);
        this.reglas.set(reglas);
        this.kfold.set(kfold);
        this.rutas.set(rutas);
        this.cap.set(params?.cap_dinamico ?? null);
        const faltantes = [
          !nnAco ? 'comparación NN vs ACO' : null,
          !estrategias ? 'estrategias contra ACTUAL' : null,
          !kfold ? 'validación cruzada (K-Fold)' : null,
          !rutas ? 'tabla de rutas' : null,
        ].filter(Boolean);
        this.aviso.set(
          faltantes.length
            ? `Aún sin precalcular: ${faltantes.join(' y ')}. Ejecuta \`python -m app.precompute\`.`
            : null,
        );
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

  /** Cambia la estrategia de la tabla de rutas y recarga sólo esas filas. */
  cambiarEstrategia(estrategia: 'recomendada' | 'actual'): void {
    this.estrategiaRutas.set(estrategia);
    this.api.ruteoRutas(estrategia, 1).subscribe({
      next: (r) => this.rutas.set(r),
      error: () => this.rutas.set(null),
    });
  }

  /**
   * Etiqueta del plan alternativo a ACTUAL: si la regla aprobó una estrategia se
   * nombra; si no, se aclara explícitamente que NO es recomendada (la regla no
   * aprueba ninguna y las K reagrupadas son diagnósticas).
   */
  etiquetaPlanAlternativo(): string {
    const r = this.reglaEstrategias;
    return r?.decision === 'recomendada' && r.recomendada
      ? `Recomendada (${r.recomendada})`
      : 'Plan alternativo';
  }

  /* ------------------------------------------------------------------ */
  /* Sección 2: NN vs ACO                                               */
  /* ------------------------------------------------------------------ */

  get global() {
    return this.nnAco()?.global ?? null;
  }

  get reglaNnAco() {
    return this.reglas()?.nn_vs_aco ?? this.nnAco()?.regla ?? null;
  }

  get criterioNnAco(): string {
    return this.nnAco()?.criterio_regla ?? this.reglas()?.criterio_nn_vs_aco ?? '';
  }

  get decisionTexto(): string {
    switch (this.reglaNnAco?.decision) {
      case 'aco':
        return 'Se adopta ACO';
      case 'mixta':
        return 'ACO sólo en un rango de rutas';
      case 'nn':
        return 'Se mantiene NN';
      default:
        return 'Sin datos';
    }
  }

  get decisionCorto(): string {
    switch (this.reglaNnAco?.decision) {
      case 'aco':
        return 'ACO';
      case 'mixta':
        return 'Mixta';
      case 'nn':
        return 'NN';
      default:
        return '—';
    }
  }

  get decisionTono(): 'exito' | 'alerta' | 'neutro' {
    return this.reglaNnAco?.decision === 'aco' ? 'exito' : 'neutro';
  }

  /** Las cinco condiciones de la regla, en el orden del criterio. */
  get condicionesNnAco(): Condicion[] {
    const cumple = this.reglaNnAco?.cumple ?? {};
    const u = this.reglaNnAco?.umbrales ?? {};
    const ahorro = fmtDec1(u['ahorro_aco_pct'] ?? 2);
    const tiempo = fmtEntero(u['tiempo_ciclo_min'] ?? 30);
    const etiquetas: Record<string, string> = {
      ahorro_minimo: `Ahorro medio por ruta ≥ ${ahorro} %`,
      ic95_positivo:
        'Límite inferior del intervalo de confianza del 95 % estrictamente mayor que 0',
      persiste_con_085:
        `El ahorro ≥ ${ahorro} % sigue cumpliéndose con el 15 % de clientes ausentes`,
      sin_violaciones_ventana: 'Cero violaciones de la ventana de visita',
      tiempo_ciclo: `Secuenciar el ciclo completo en ≤ ${tiempo} minutos (procesos en paralelo)`,
    };
    return Object.keys(etiquetas).map((clave) => ({
      clave,
      etiqueta: etiquetas[clave],
      cumple: !!cumple[clave],
    }));
  }

  get kpiAhorro(): string {
    return fmtDec1(this.global?.ahorro_medio_pct ?? null);
  }

  get kpiIntervalo(): string {
    const g = this.global;
    if (!g) return '—';
    return `${fmtDec1(g.ic95_inf_pct)} % – ${fmtDec1(g.ic95_sup_pct)} %`;
  }

  get kpiTiempos(): string {
    const g = this.global;
    if (!g) return '—';
    return `${fmtEntero(Math.round(g.t_ciclo_min))} min`;
  }

  get pValorTexto(): string {
    const p = this.nnAco()?.wilcoxon?.p_value;
    if (p === undefined || p === null) return '—';
    if (p < 0.001) return '< 0,001';
    return p.toFixed(4).replace('.', ',');
  }

  /** Histograma del ahorro por ruta: cuántas rutas gana ACO y cuántas no. */
  get histogramaAhorros(): ChartConfiguration<'bar'> {
    const vals = (this.nnAco()?.por_ruta ?? []).map((r) => r.ahorro_pct);
    if (!vals.length) {
      return { type: 'bar', data: { labels: [], datasets: [] } };
    }
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const ancho = Math.max(0.5, Math.ceil(((max - min) / 12) * 2) / 2);
    const desde = Math.floor(min / ancho) * ancho;
    const n = Math.max(1, Math.ceil((max - desde) / ancho + 1e-9) + 1);
    const conteo = new Array<number>(n).fill(0);
    for (const v of vals) {
      const i = Math.min(n - 1, Math.max(0, Math.floor((v - desde) / ancho)));
      conteo[i]++;
    }
    const colores = conteo.map((_, i) => {
      const centro = desde + (i + 0.5) * ancho;
      return centro > 0 ? '#43a047' : centro < 0 ? '#e53935' : '#90a4ae';
    });
    return {
      type: 'bar',
      data: {
        labels: conteo.map((_, i) => fmtDec1(desde + i * ancho)),
        datasets: [
          { label: 'Rutas', data: conteo, backgroundColor: colores, borderRadius: 3 },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) =>
                `Ahorro de ${items[0]?.label ?? ''} % a ` +
                `${fmtDec1(desde + (items[0]?.dataIndex ?? 0) * ancho + ancho)} %`,
            },
          },
        },
        scales: {
          y: { title: { display: true, text: 'Número de rutas' }, ticks: { precision: 0 } },
          x: { title: { display: true, text: 'Ahorro de ACO por ruta (%)' } },
        },
      },
    };
  }

  /** Curva: ahorro medio con su intervalo de confianza frente a ausencias. */
  get curvaAusencias(): ChartConfiguration<'line'> {
    const rb = this.nnAco()?.robustez ?? [];
    if (!rb.length) {
      return { type: 'line', data: { labels: [], datasets: [] } };
    }
    return {
      type: 'line',
      data: {
        labels: rb.map((r) => `${fmtEntero(Math.round((1 - r.p_asist) * 100))} %`),
        datasets: [
          {
            label: 'Límite superior del intervalo',
            data: rb.map((r) => r.ic95_sup_pct),
            borderColor: SERIE[1],
            backgroundColor: 'rgba(0, 137, 123, 0.15)',
            fill: '+1',
            pointRadius: 0,
            tension: 0.25,
          },
          {
            label: 'Límite inferior del intervalo',
            data: rb.map((r) => r.ic95_inf_pct),
            borderColor: SERIE[1],
            pointRadius: 0,
            tension: 0.25,
          },
          {
            label: 'Ahorro medio',
            data: rb.map((r) => r.ahorro_medio_pct),
            borderColor: SERIE[0],
            backgroundColor: SERIE[0],
            borderWidth: 3,
            pointRadius: 4,
            tension: 0.25,
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (item) => `${item.dataset.label}: ${fmtDec1(item.parsed.y)} %`,
            },
          },
        },
        scales: {
          y: { title: { display: true, text: 'Ahorro de ACO (%)' } },
          x: { title: { display: true, text: 'Clientes ausentes en el ciclo' } },
        },
      },
    };
  }

  /** Tiempos: NN, ACO sumado y ACO en paralelo (lo que mide la regla). */
  get tiemposChart(): ChartConfiguration<'bar'> {
    const g = this.global;
    if (!g) {
      return { type: 'bar', data: { labels: [], datasets: [] } };
    }
    return {
      type: 'bar',
      data: {
        labels: [
          'Vecino más cercano (NN): suma de rutas',
          'Colonias de hormigas (ACO): suma de rutas',
          'Colonias de hormigas (ACO): ciclo completo en paralelo',
        ],
        datasets: [
          {
            label: 'Minutos',
            data: [g.t_nn_total_min, g.t_aco_total_min, g.t_ciclo_min],
            backgroundColor: [SERIE[0], SERIE[1], SERIE[6]],
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y' as const,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (item) => `${fmtDec1(item.parsed.x)} minutos` },
          },
        },
        scales: {
          x: { title: { display: true, text: 'Minutos' } },
          y: { ticks: { autoSkip: false } },
        },
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Sección 3: estrategias contra ACTUAL                               */
  /* ------------------------------------------------------------------ */

  get filasEstrategias(): FilaEstrategia[] {
    return this.estrategias()?.tabla ?? [];
  }

  get reglaEstrategias() {
    return this.reglas()?.estrategias ?? null;
  }

  get umbrales(): Record<string, number> {
    return this.reglas()?.umbrales ?? {};
  }

  get decisionEstrategias(): string {
    return this.reglaEstrategias?.decision ?? '—';
  }

  get decisionEstrategiasTexto(): string {
    const r = this.reglaEstrategias;
    if (!r) return 'Sin datos';
    return r.decision === 'recomendada'
      ? `Se adopta ${r.recomendada}`
      : 'Ninguna estrategia cumple las condiciones';
  }

  /** Las 6 condiciones de la regla de estrategias, con su umbral declarado. */
  get condicionesEstrategia(): { clave: string; etiqueta: string }[] {
    const u = this.umbrales;
    return [
      { clave: 'factibilidad', etiqueta: 'Factibilidad: 0 días sobre el tope diario' },
      {
        clave: 'costo',
        etiqueta: 'Costo: IC95 superior del Δcosto < 0 vs ACTUAL (pareado)',
      },
      {
        clave: 'cumplimiento',
        etiqueta: `Cobertura: pérdida ≤ ${fmtDec1(u['cobertura_pp'] ?? 0.5)} puntos porcentuales`,
      },
      {
        clave: 'eficiencia',
        etiqueta: `Distancia ≤ ${fmtDec2(u['ratio_km_vs_actual'] ?? 1.25)} × la de ACTUAL`,
      },
      {
        clave: 'generalizacion',
        etiqueta:
          `Generalización: km extra en test ≤ ${fmtEntero(u['km_extra_test_pct'] ?? 5)} % ` +
          `y arrepentimiento ≤ ${fmtEntero(u['arrepentimiento_pct'] ?? 5)} %`,
      },
      {
        clave: 'estabilidad',
        etiqueta: `Mismo número de asesores (o ±1) en ${fmtEntero(
          u['estabilidad_semillas'] ?? 2,
        )} de 3 semillas`,
      },
    ];
  }

  condicionEstrategia(estrategia: string, clave: string): boolean | null {
    const c = this.reglaEstrategias?.condiciones_por_estrategia?.[estrategia];
    if (!c || c[clave] === undefined) return null;
    return !!c[clave];
  }

  dimensionDe(f: FilaEstrategia, clave: string): DimensionEstrategia | null {
    return this.estrategias()?.estrategias?.[f.estrategia]?.dimensiones?.[clave] ?? null;
  }

  cumpleDimension(f: FilaEstrategia, clave: string): boolean | null {
    const c = this.dimensionDe(f, clave)?.cumple;
    return c === undefined ? null : !!c;
  }

  valorDimension(f: FilaEstrategia, clave: string): ValorDim {
    switch (clave) {
      case 'costo': {
        const ic = f.ic95_delta_costo_M;
        return {
          valor: `${fmtDec2(f.costo_M)} M COP`,
          detalle: ic
            ? `Δ ${fmtDec1(f.delta_costo_M)} M (IC95 ${fmtDec1(ic[0])} a ${fmtDec1(ic[1])})`
            : f.delta_costo_pct === null
              ? 'línea base'
              : `${fmtDec1(f.delta_costo_pct)} % vs ACTUAL`,
        };
      }
      case 'eficiencia':
        return {
          valor: `${fmtEntero(f.km)} km`,
          detalle:
            f.ratio_km === null ? 'línea base' : `${fmtDec2(f.ratio_km)} × ACTUAL`,
        };
      case 'factibilidad':
        return { valor: `${fmtEntero(f.dias_sobre_cap)} días`, detalle: 'sobre el tope' };
      case 'cumplimiento':
        return {
          valor: fmtPct(f.cobertura),
          detalle:
            f.delta_cobertura_pp === null
              ? 'línea base'
              : `${fmtDec1(f.delta_cobertura_pp)} puntos vs ACTUAL`,
        };
      case 'balance':
        return {
          valor: f.cv_carga === null ? '—' : fmtDec2(f.cv_carga),
          detalle: 'desigualdad (menor = mejor)',
        };
      case 'generalizacion':
        return {
          valor: `${fmtDec1(f.km_extra_test_pct)} %`,
          detalle: `arrepentimiento ${fmtDec1(f.arrepentimiento_pct)} %`,
        };
      case 'estabilidad': {
        const c = this.cumpleDimension(f, 'estabilidad');
        return {
          valor: c === true ? 'Estable' : c === false ? 'No estable' : '—',
          detalle: 'entre 3 semillas',
        };
      }
      case 'compacidad':
        return {
          valor: f.compacidad === null ? '—' : fmtDec1(f.compacidad),
          detalle: 'visitas por asesor-día',
        };
      default:
        return { valor: '—', detalle: '' };
    }
  }

  get f2() {
    return this.estrategias()?.f2_rebalanceo ?? null;
  }

  get estabilidad() {
    return this.estrategias()?.estabilidad ?? null;
  }

  /* ------------------------------------------------------------------ */
  /* Validación cruzada (K-Fold) y rutas                                */
  /* ------------------------------------------------------------------ */

  metricaDe(clave: string) {
    return this.kfold()?.resumen?.[clave as 'km_ciclo'] ?? null;
  }

  etiquetaMetrica(clave: string): string {
    const nombres: Record<string, string> = {
      km_ciclo: 'Distancia por ciclo',
      costo_det_M: 'Costo por ciclo',
      pico_carga: 'Pico diario de visitas por asesor',
      dias_sobre_cap: 'Días sobre el tope diario',
      cv_carga: 'Desigualdad de carga entre asesores',
      km_extra_p50: 'Km extra por cliente de test (percentil 50)',
      km_extra_p90: 'Km extra por cliente de test (percentil 90)',
      pct_ruta_nueva: 'Clientes sin ruta previa ese día',
      pct_excede_cap: 'Visitas que exceden el tope (durante la inserción)',
      pct_no_insertados: 'Clientes de test que no cupieron',
      arrepentimiento_pct: 'Arrepentimiento por re-planificar',
    };
    return nombres[clave] ?? clave;
  }

  unidadMetrica(clave: string): string {
    if (clave.startsWith('pct_') || clave.endsWith('_pct')) return '%';
    if (clave === 'km_extra_p50' || clave === 'km_extra_p90') return 'km';
    if (clave === 'costo_det_M') return 'M COP';
    if (clave === 'km_ciclo') return 'km';
    if (clave === 'dias_sobre_cap') return 'días';
    if (clave === 'pico_carga') return 'visitas';
    return '';
  }

  colorMetrica(clave: string): 'exito' | 'alerta' | 'info' | 'neutro' | 'primario' {
    if (clave === 'dias_sobre_cap') {
      return (this.metricaDe(clave)?.media ?? 0) === 0 ? 'exito' : 'alerta';
    }
    return clave.startsWith('pct_') ? 'info' : 'primario';
  }

  get notaKfold(): string {
    return this.kfold()?.nota ?? '';
  }

  get notaCriterio(): string {
    const r = this.reglaEstrategias;
    if (!r) return '';
    return `${r.criterio} ${r.nota ?? ''}`.trim();
  }
}
