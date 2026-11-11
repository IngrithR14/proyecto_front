import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import type {
  Calendario,
  ChatRespuesta,
  ChatSalud,
  CargaZona,
  ComparacionEstrategias,
  ComparacionK,
  Correlaciones,
  EdaResumen,
  Estrategia,
  EvalEstrategias,
  EvalNnVsAco,
  GeoData,
  MejorEstrategia,
  MonteCarloTabla,
  Params,
  ReglasRespuesta,
  RuteoKfold,
  RuteoRutas,
  Salud,
  Universos,
} from './models';

/** Error lanzado cuando el backend aún no precalculó el resultado (HTTP 503). */
export class BackendNoListoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'BackendNoListoError';
  }
}

export function esErrorNoListo(err: unknown): err is BackendNoListoError {
  return err instanceof BackendNoListoError;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly base = '/api';

  /* ---------------- Meta ---------------- */

  salud(): Observable<Salud> {
    return this.get<Salud>('/salud');
  }

  params(): Observable<Params> {
    return this.get<Params>('/meta/params');
  }

  universos(): Observable<Universos> {
    return this.get<Universos>('/meta/universos');
  }

  calendario(): Observable<Calendario> {
    return this.get<Calendario>('/meta/calendario');
  }

  /* ---------------- EDA ---------------- */

  edaResumen(): Observable<EdaResumen> {
    return this.get<EdaResumen>('/eda/resumen');
  }

  cargaZona(top = 1000): Observable<CargaZona> {
    return this.get<CargaZona>(`/eda/carga-zona?top=${top}`);
  }

  correlaciones(): Observable<Correlaciones> {
    return this.get<Correlaciones>('/eda/correlaciones');
  }

  /* ---------------- Ruteo ---------------- */

  ruteoComparacion(): Observable<ComparacionEstrategias> {
    return this.get<ComparacionEstrategias>('/ruteo/comparacion');
  }

  /** K-Fold CV del ruteo: estabilidad (media ± desviación) entre pliegues. */
  ruteoKfold(): Observable<RuteoKfold> {
    return this.get<RuteoKfold>('/ruteo/kfold');
  }

  /** Rutas del primer ciclo por día y asesor (estrategia: actual | recomendada). */
  ruteoRutas(estrategia = 'recomendada', quincena = 1): Observable<RuteoRutas> {
    return this.get<RuteoRutas>(
      `/ruteo/rutas?estrategia=${estrategia}&quincena=${quincena}`,
    );
  }

  /* ---------------- Protocolo de evaluación ---------------- */

  /** Sección 2: NN vs ACO por pares de ruta (ahorros con IC95, robustez, regla). */
  evalNnVsAco(): Observable<EvalNnVsAco> {
    return this.get<EvalNnVsAco>('/evaluacion/nn-vs-aco');
  }

  /** Sección 3: estrategias contra ACTUAL (8 dimensiones, 6 condiciones, F2). */
  evalEstrategias(): Observable<EvalEstrategias> {
    return this.get<EvalEstrategias>('/evaluacion/estrategias');
  }

  /** Las dos reglas de decisión con sus condiciones y sus criterios. */
  evalRegla(): Observable<ReglasRespuesta> {
    return this.get<ReglasRespuesta>('/evaluacion/regla');
  }

  /* ---------------- MonteCarlo ---------------- */

  mcTabla(): Observable<MonteCarloTabla> {
    return this.get<MonteCarloTabla>('/montecarlo/tabla');
  }

  mcActual(): Observable<Estrategia> {
    return this.get<Estrategia>('/montecarlo/actual');
  }

  mcEstrategia(k: number): Observable<Estrategia> {
    return this.get<Estrategia>(`/montecarlo/estrategia/${k}`);
  }

  mcComparacion(k: number): Observable<ComparacionK> {
    return this.get<ComparacionK>(`/montecarlo/comparacion/${k}`);
  }

  mcMejor(): Observable<MejorEstrategia> {
    return this.get<MejorEstrategia>('/montecarlo/mejor');
  }

  /* ---------------- Geo ---------------- */

  geo(clave: string | number): Observable<GeoData> {
    return this.get<GeoData>(`/geo/${clave}`);
  }

  /* ---------------- Chat ---------------- */

  chatSalud(): Observable<ChatSalud> {
    return this.get<ChatSalud>('/chat/salud');
  }

  chat(pregunta: string, sesion: string): Observable<ChatRespuesta> {
    return this.post<ChatRespuesta>('/chat', { pregunta, sesion });
  }

  /* ---------------- Interno ---------------- */

  private get<T>(path: string): Observable<T> {
    return this.http
      .get<T>(`${this.base}${path}`)
      .pipe(catchError((err) => throwError(() => this.normalizar(err))));
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<T>(`${this.base}${path}`, body)
      .pipe(catchError((err) => throwError(() => this.normalizar(err))));
  }

  private normalizar(err: unknown): Error {
    const e = err as { status?: number; error?: unknown; message?: string; statusText?: string };
    const cuerpo = e?.error;
    const crudo =
      typeof cuerpo === 'string' && cuerpo.trim()
        ? cuerpo
        : cuerpo && typeof cuerpo === 'object' && 'error' in (cuerpo as object)
          ? String((cuerpo as Record<string, unknown>)['error'])
          : cuerpo && typeof cuerpo === 'object' && 'detail' in (cuerpo as object)
            ? String((cuerpo as Record<string, unknown>)['detail'])
            : null;
    // sólo se muestra si parece un mensaje humano (y no HTML del proxy)
    const detalle =
      crudo && crudo.length < 300 && !/[<][a-z/]/i.test(crudo) ? crudo : null;

    // 503: el backend está vivo pero aún no tiene el resultado precalculado.
    if (e?.status === 503) {
      return new BackendNoListoError(
        detalle ?? 'El backend está calculando este resultado… inténtelo de nuevo en unos minutos.',
      );
    }
    // 502/504 (proxy sin backend) o status 0 (red): no hay conexión.
    // El `detalle` del proxy no suele ser legible, así que se usa mensaje propio.
    if (e?.status === 502 || e?.status === 504 || !e?.status) {
      return new BackendNoListoError(
        'No hay conexión con el backend (¿está corriendo en http://127.0.0.1:8000?). Pulsa "Reintentar".',
      );
    }
    return new Error(detalle ?? `El backend respondió con un error (HTTP ${e.status}).`);
  }
}
