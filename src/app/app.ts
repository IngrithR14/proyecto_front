import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from './core/api.service';
import { fmtEntero } from './core/formato';
import type { Params, Universos } from './core/models';

interface ItemMenu {
  ruta: string;
  etiqueta: string;
  icono: string;
  desc: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly bp = inject(BreakpointObserver);
  private temporizadorReintento: ReturnType<typeof setInterval> | null = null;

  readonly universos = signal<Universos | null>(null);
  readonly params = signal<Params | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly esMovil = signal(false);
  readonly abierto = signal(true);

  readonly fmtEntero = fmtEntero;

  readonly items: ItemMenu[] = [
    { ruta: '/', etiqueta: 'EDA', icono: 'query_stats', desc: 'Perfil y distribuciones' },
    {
      ruta: '/ruteo',
      etiqueta: 'Modelo de ruteo',
      icono: 'route',
      desc: 'NN vs ACO',
    },
    {
      ruta: '/montecarlo',
      etiqueta: 'MonteCarlo',
      icono: 'casino',
      desc: 'Número de asesores K',
    },
    { ruta: '/asistente', etiqueta: 'Asistente', icono: 'smart_toy', desc: 'Chat con IA' },
  ];

  ngOnInit(): void {
    this.bp.observe([Breakpoints.Handset, Breakpoints.TabletPortrait]).subscribe((r) => {
      this.esMovil.set(r.matches);
      this.abierto.set(!r.matches);
    });

    this.cargarEstado();
    this.cargarParams();
  }

  /** Carga los universos del toolbar. Si el backend no responde queda en `error`. */
  private cargarEstado(silencioso = false): void {
    if (!silencioso) this.cargando.set(true);
    this.api.universos().subscribe({
      next: (u) => {
        this.universos.set(u);
        this.error.set(null);
        this.cargando.set(false);
        this.detenerReintentoAutomatico();
      },
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'Error al cargar /meta/universos');
        this.cargando.set(false);
        this.programarReintentoAutomatico();
      },
    });
  }

  private cargarParams(): void {
    this.api.params().subscribe({
      next: (p) => this.params.set(p),
      error: () => this.params.set(null),
    });
  }

  /** Mientras el chip marque "backend no disponible", reintenta solo cada 10 s. */
  private programarReintentoAutomatico(): void {
    if (this.temporizadorReintento) return;
    this.temporizadorReintento = setInterval(() => this.cargarEstado(true), 10_000);
  }

  private detenerReintentoAutomatico(): void {
    if (this.temporizadorReintento) {
      clearInterval(this.temporizadorReintento);
      this.temporizadorReintento = null;
    }
  }

  /** Botón "Reintentar" del chip de estado de la barra superior. */
  recargarEstado(): void {
    this.cargarEstado();
    if (!this.params()) this.cargarParams();
  }

  ngOnDestroy(): void {
    this.detenerReintentoAutomatico();
  }

  alternarSidenav(): void {
    this.abierto.update((v) => !v);
  }
}
