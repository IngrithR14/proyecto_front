/**
 * Tipos (interfaces) que reflejan el contrato de la API FastAPI de ruteo.
 * Todos los datos son AGREGADOS: nunca contienen datos personales de clientes.
 */

/* ---------- Meta ---------- */

export interface Salud {
  ok: boolean;
  version: string;
  montecarlo_cacheado: boolean;
  cache_dir?: string;
}

export type EtiquetaParam = 'supuesto' | 'calibrado';

export interface Parametro {
  valor: number | string | boolean;
  etiqueta: EtiquetaParam | string;
  nota: string;
}

export interface Params {
  params: Record<string, Parametro>;
  cap_dinamico: number;
  costo_fijo_ciclo: number;
  k_min: number;
  k_max: number;
  k_actual: number;
}

export interface PasoEmbudo {
  paso: string;
  filas: number;
  eliminadas: number;
}

export interface Universos {
  unidad_asesor: string;
  n_clientes: number;
  visitas_totales_mes: number;
  visitas_por_dia: number;
  embudo: PasoEmbudo[];
  zonas_base: number;
  zonas_rutable: number;
  zonas_perdidas: string[];
  columnas_danadas?: string[];
  grupos_asesor_cd?: number;
  grupos_bajo_umbral?: number;
}

export interface CalendarioMeta {
  anio_ref: number;
  mes_ref: number;
  n_fechas: number;
  descuadre_ocurrencias: number;
  total_visitas: number;
  escenario_dias?: string;
}

export interface CalendarioResumen {
  cv_mensual: number;
  cv_asesor_dia: number;
  media_visitas_dia: number;
  pico_global: number;
  pico_medio_por_asesor: number;
  pico_max_por_asesor: number;
  pct_sobre_cap: number;
  pct_mayor_45: number;
  pct_menor_40: number;
  visitas_por_dia_semana: Record<string, number>;
  total_visitas: number;
  n_asesores: number;
}

export interface Calendario {
  meta: CalendarioMeta;
  resumen: CalendarioResumen;
}

/* ---------- EDA ---------- */

export interface Kpis {
  n_clientes: number;
  n_zonas: number;
  visitas_mes_rep: number;
  visitas_por_dia: number;
  activos: number;
  pct_activos: number;
  falsos_inactivos: number;
  es_rural: number;
  sucursales: number;
}

export interface Distribucion {
  labels: string[];
  values: number[];
  pct: number[];
  total: number;
}

export interface Histograma {
  bins: number[];
  counts: number[];
  media: number;
  std: number;
  min: number;
  max: number;
}

export interface CargaZona {
  top?: number;
  zonas: string[];
  clientes: number[];
  activos: number[];
  visitas_mes_rep: number[];
  visitas_dia: number[];
  n_zonas: number;
}

export interface PuntoScatter {
  lat: number;
  lon: number;
  cat: string;
  dep: string;
}

export interface Crosstab {
  filas: string[];
  columnas: string[];
  matriz: number[][];
}

export interface MatrizCorr {
  index: string[];
  columns: string[];
  matriz: number[][];
}

export interface ParCorr {
  a: string;
  b: string;
  r: number;
}

export interface Correlaciones {
  pearson: MatrizCorr;
  pearson_pares: ParCorr[];
  cramers_v: MatrizCorr;
  eta: MatrizCorr;
}

export interface EdaResumen {
  kpis: Kpis;
  distribuciones: Record<string, Distribucion>;
  histogramas: Record<string, Histograma>;
  carga_zona: CargaZona;
  scatter: PuntoScatter[];
  crosstabs: Record<string, Crosstab>;
  correlaciones: Correlaciones;
}

/* ---------- Ruteo (Alt.A NN vs Alt.B ACO) ---------- */

export interface ComparacionEstrategias {
  n_seeds: number;
  sub_rutas_muestra: number;
  rango_muestra: [number, number] | number[];
  /** Unidad de distancias/estadísticos (km). */
  unidad?: string;
  /** Nota: NN es determinista, ACO se aleatoriza (no es sobreajuste). */
  nota_nn?: string;
  exp: ExperimentoSemilla[];
  resumen: ResumenEstrategia[];
  wilcoxon: Wilcoxon;
  victorias_NN: number;
  victorias_ACO: number;
  /** Distancia NN/ACO por sub-ruta (curva distancia vs nº de clientes). */
  por_subruta?: PuntoSubRuta[];
  /** Rectas de tendencia + R² (distancia y ahorro vs nº de clientes). */
  tendencia?: Record<string, RectaTendencia>;
  /** Secuencias NN y ACO de una sub-ruta representativa. */
  rutas_ejemplo?: RutaEjemplo | null;
}

export interface PuntoSubRuta {
  sub_ruta: string;
  n_clientes: number;
  dist_NN: number;
  dist_ACO: number;
  ahorro_pct: number;
}

export interface RectaTendencia {
  pendiente: number | null;
  intercepto: number | null;
  r2: number | null;
}

export interface RutaEjemplo {
  sub_ruta: string;
  n_clientes: number;
  dist_NN_km: number;
  dist_ACO_km: number;
  /** [lat, lon] en orden de visita; índice 0 = depósito. */
  nn: [number, number][];
  aco: [number, number][];
}

export interface ExperimentoSemilla {
  semilla: number;
  NN: number;
  ACO: number;
  t_NN: number;
  t_ACO: number;
  factible: number;
}

export interface ResumenEstrategia {
  estrategia: string;
  mean: number;
  std: number;
  min: number;
  max: number;
  '% semillas en que gana': number;
  empates: number;
}

export interface Wilcoxon {
  estadistico: number;
  p_value: number;
  significativo_005: boolean;
}

/* ---------- Ruteo: K-Fold y rutas del primer ciclo ---------- */

export interface MetricaKfold {
  media: number;
  desv: number;
  min: number;
  max: number;
}

export interface PliegueKfold {
  pliegue: number;
  n_train: number;
  n_test: number;
  km_ciclo: number;
  costo_det_M: number;
  pico_carga: number;
  dias_sobre_cap: number;
  factible: boolean;
  cv_carga: number;
  cobertura_exacta?: boolean;
  n_asesores?: number;
}

export interface RuteoKfold {
  k_territorios: number;
  k_pliegues: number;
  metricas: string[];
  nota: string;
  pliegues: PliegueKfold[];
  resumen: {
    km_ciclo: MetricaKfold;
    costo_det_M: MetricaKfold;
    pico_carga: MetricaKfold;
    dias_sobre_cap: MetricaKfold;
    cv_carga: MetricaKfold;
    pct_factible: number;
  };
}

export interface RutaFila {
  fecha: string;
  asesor: number | string;
  n_visitas: number;
  km: number;
  /** Códigos de cliente (pseudónimos); nunca nombres ni cédulas. */
  secuencia: string[];
  excede_cap: boolean;
}

export interface RuteoRutas {
  estrategia: string;
  k_territorios?: number;
  es_recomendada?: boolean;
  etiqueta?: string;
  quincena: number;
  n_rutas: number;
  total_visitas: number;
  total_km: number;
  n_asesores: number;
  rutas: RutaFila[];
}

/* ---------- Protocolo de evaluación (secciones 2 y 3) ---------- */

/** Métricas del protocolo NN vs ACO por pares de ruta (sección 2). */
export interface ResumenNnAco {
  n_rutas: number;
  n_clientes: number;
  km_nn_total: number;
  km_aco_total: number;
  /** Ahorro medio por ruta: 100·(km_NN − km_ACO)/km_NN. */
  ahorro_medio_pct: number;
  ic95_inf_pct: number;
  ic95_sup_pct: number;
  ahorro_mediano_pct: number;
  pct_mejor: number;
  pct_empate: number;
  pct_peor: number;
  violaciones_ventana: number;
  t_nn_total_min: number;
  t_aco_total_min: number;
  /** Tiempo en pared de secuenciar el ciclo entero (condición 5 de la regla). */
  t_ciclo_min: number;
  n_jobs?: number;
  tolerancia_empate_pct?: number;
  dispersion_aco?: {
    semillas_por_ruta: number;
    desv_media_seeds_km: number;
    desv_max_seeds_km: number;
    nota: string;
  };
  nota?: string;
}

export interface AhorroRuta {
  ruta: string;
  territorio?: string | null;
  fecha?: string | null;
  n_clientes: number;
  km_nn: number;
  km_aco: number;
  ahorro_pct: number;
  t_nn_s: number;
  t_aco_s: number;
  violaciones_ventana: number;
  /** aco_mejor | empate | aco_peor (tolerancia declarada). */
  resultado?: string;
}

export interface AhorroPorTamano {
  rango: string;
  lo: number;
  hi: number;
  n_rutas: number;
  ahorro_medio_pct: number | null;
  ic95_inf_pct: number | null;
  ic95_sup_pct: number | null;
  pct_mejor: number | null;
  pct_empate: number | null;
  pct_peor: number | null;
  km_nn_total: number;
  km_aco_total: number;
}

/** Robustez: ahorro con clientes ausentes (escenarios de simulación). */
export interface RobustezAhorro {
  p_asist: number;
  n_sim: number;
  n_rutas: number;
  km_medio_por_ruta_nn: number;
  km_medio_por_ruta_aco: number;
  ahorro_medio_pct: number;
  ic95_inf_pct: number;
  ic95_sup_pct: number;
  ahorro_medio_escenario_pct: number;
  nota?: string;
}

export interface WilcoxonRuta {
  n: number;
  estadistico?: number;
  p_value?: number;
  significativo_005?: boolean;
  efecto_r?: number;
  interpretacion_efecto?: string;
  aplicable: boolean;
  nota?: string;
}

export interface ReglaNnAco {
  decision: 'aco' | 'nn' | 'mixta';
  /** Las cinco condiciones del criterio, en orden de aparición. */
  cumple: Record<string, boolean>;
  rangos_con_aco: string[];
  veredicto: string;
  criterio: string;
  umbrales?: Record<string, number>;
}

export interface EvalNnVsAco {
  meta?: Record<string, unknown>;
  global: ResumenNnAco;
  por_tamano: AhorroPorTamano[];
  por_ruta: AhorroRuta[];
  wilcoxon: WilcoxonRuta;
  robustez: RobustezAhorro[];
  regla: ReglaNnAco;
  criterio_regla: string;
}

/** Una de las 8 dimensiones de una estrategia frente a ACTUAL. */
export type DimensionEstrategia = Record<string, unknown> & {
  cumple?: boolean;
  umbral?: string;
  nota?: string;
};

export interface EstrategiaEvaluada {
  etiqueta: string;
  recomendable: boolean;
  es_diagnostica: boolean;
  K: number;
  estrategia: string;
  dimensiones: Record<string, DimensionEstrategia>;
  /** Las 6 condiciones de la regla (sección 3). */
  condiciones: Record<string, boolean>;
  cumple_todas: boolean;
  resumen?: Record<string, unknown>;
}

export interface FilaEstrategia {
  estrategia: string;
  etiqueta: string;
  K: number;
  es_diagnostica: boolean;
  costo_M: number | null;
  delta_costo_pct: number | null;
  delta_costo_M?: number | null;
  ic95_delta_costo_M?: [number, number] | null;
  ic95_delta_km?: [number, number] | null;
  km: number | null;
  ratio_km: number | null;
  dias_sobre_cap: number;
  cobertura: number | null;
  delta_cobertura_pp: number | null;
  cv_carga: number | null;
  km_extra_test_pct: number | null;
  arrepentimiento_pct: number | null;
  compacidad: number | null;
  cumple_todas: boolean;
  recomendable: boolean;
}

export interface PlanEvaluado {
  km_actual?: number | null;
  km_rebal?: number | null;
  delta_km_plan_pct?: number | null;
  cobertura_actual?: number | null;
  cobertura_rebal?: number | null;
}

export interface F2Rebalanceo {
  poblacion_del_rebalanceo: string;
  clientes_totales?: number;
  clientes_movidos?: number;
  clientes_movidos_pct?: number;
  dias_sobre_tope_antes?: number;
  dias_sobre_tope_despues?: number;
  pico_antes?: number;
  pico_despues?: number;
  factible_antes?: boolean;
  factible_despues?: boolean;
  logro_factibilidad?: boolean;
  km_antes?: number;
  km_despues?: number;
  delta_km?: number;
  delta_km_pct?: number;
  movimientos?: Array<Record<string, unknown>>;
  plan_evaluado?: PlanEvaluado;
  verificaciones?: Record<string, boolean | null>;
  nota?: string;
}

export interface EstabilidadK {
  semillas: number[];
  K_grid: number[];
  K_elegidas: number[];
  acuerdo_misma_K_o_mas_menos_1: number;
  umbral: number;
  cumple: boolean;
  correlaciones?: Array<{ semillas: number[]; rho: number; p_value: number }>;
  rho_minimo?: number;
  filas?: Array<Record<string, unknown>>;
  nota?: string;
}

export interface EvalEstrategias {
  meta?: Record<string, unknown>;
  tabla: FilaEstrategia[];
  estrategias: Record<string, EstrategiaEvaluada>;
  f2_rebalanceo: F2Rebalanceo;
  estabilidad?: EstabilidadK | null;
  eleccion?: {
    semilla?: number;
    tabla?: FilaEstrategia[];
    regla?: ReglaEstrategias | null;
  } | null;
  nota?: string;
}

export interface ReglaEstrategias {
  decision: 'recomendada' | 'ninguna';
  recomendada: string | null;
  veredicto: string;
  criterio: string;
  pool_candidatas: string[];
  condiciones_por_estrategia: Record<string, Record<string, boolean>>;
  diagnosticas: string[];
  nota?: string;
}

export interface ReglasRespuesta {
  estrategias: ReglaEstrategias | null;
  nn_vs_aco: ReglaNnAco | null;
  criterio_estrategias?: string;
  criterio_nn_vs_aco?: string;
  umbrales?: Record<string, number>;
  etiqueta_umbrales?: string;
}

/* ---------- MonteCarlo ---------- */

export interface Estrategia {
  estrategia: string;
  K: number;
  costo_medio_M: number;
  ic95_inf: number;
  ic95_sup: number;
  mediana_M: number;
  p95_M: number;
  cvar5_M: number;
  km_medio: number;
  visitas_media: number;
  cobertura: number;
  visitas_perdidas: number;
  factible: boolean;
  dias_sobre_cap: number;
  utilizacion_max: number;
  cv_carga: number;
  cv_asesor_dia: number;
  pico_carga: number;
  prob_no_completar: number;
  horas_media_dia: number;
  pct_fijo: number;
  pct_combustible: number;
  pct_extra: number;
  n_rutas_dia: number;
  cobertura_exacta?: boolean;
}

export interface ComparacionK {
  k: number;
  k_actual?: number;
  dif_media_M: number;
  ic95_inf: number;
  ic95_sup: number;
  p_mejor: number;
  costo_actual_M?: number;
  costo_k_M?: number;
}

export interface MonteCarloTabla {
  n_sim: number;
  actual: Estrategia;
  estrategias: Record<string, Estrategia>;
  comparaciones: Record<string, ComparacionK>;
}

export interface MejorEstrategia {
  minima_factible: number;
  mejor_factible: Estrategia | null;
  mas_barata_global: Estrategia | null;
  n_estrategias: number;
}

/* ---------- Geo ---------- */

export interface Territorio {
  id: string;
  n: number;
  visitas: number;
  lat: number;
  lon: number;
}

export interface PuntoGeo {
  lat: number;
  lon: number;
  t: string;
  meta?: string;
}

export interface GeoData {
  territorios: Territorio[];
  puntos: PuntoGeo[];
}

/* ---------- Chat ---------- */

export interface ChatRespuesta {
  respuesta: string;
  herramientas: string[];
  privacidad_ok: boolean;
  incidencias: string[];
  sesion: string;
  /** Modelo real que respondió (principal o fallback). */
  modelo?: string | null;
}

export interface ChatSalud {
  proveedor: string;
  modelo: string;
  configurado: boolean;
  nota: string;
}
