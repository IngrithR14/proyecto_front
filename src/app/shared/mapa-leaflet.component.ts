import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';
import type { PuntoGeo, Territorio } from '../core/models';

export interface ItemLeyenda {
  label: string;
  color: string;
}

export interface Leyenda {
  titulo: string;
  items: ItemLeyenda[];
}

/**
 * Mapa Leaflet (OpenStreetMap) con puntos coloreados por categoría/territorio
 * y marcadores de centroides. Sólo coordenadas agregadas.
 */
@Component({
  selector: 'app-mapa-leaflet',
  standalone: true,
  templateUrl: './mapa-leaflet.component.html',
  styleUrl: './mapa-leaflet.component.scss',
})
export class MapaLeafletComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapa', { static: true }) contenedor!: ElementRef<HTMLDivElement>;

  @Input() puntos: PuntoGeo[] = [];
  @Input() territorios: Territorio[] = [];
  @Input() colorDe: (t: string, i: number, total: number) => string = (_t, i, total) =>
    `hsl(${Math.round((i * 360) / Math.max(total, 1)) % 360} 62% 48%)`;
  @Input() leyenda: Leyenda | null = null;
  @Input() altura = 480;
  @Input() radio = 4;

  private mapa?: L.Map;
  private capa?: L.LayerGroup;
  private listo = false;
  private observer?: ResizeObserver;

  ngAfterViewInit(): void {
    this.mapa = L.map(this.contenedor.nativeElement, {
      center: [4.9, -73.9],
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores',
    }).addTo(this.mapa);
    this.capa = L.layerGroup().addTo(this.mapa);
    this.listo = true;
    this.dibujar();

    // Leaflet calcula el tamaño de su contenedor al crearse. Si el contenedor aún
    // no tiene su tamaño final (render posterior a la carga de datos, grillas con
    // transición o pestañas), los tiles salen en blanco. Se invalida al terminar el
    // render y cada vez que el contenedor cambia de tamaño.
    setTimeout(() => this.mapa?.invalidateSize({ animate: false }), 0);
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.mapa?.invalidateSize({ animate: false }));
      this.observer.observe(this.contenedor.nativeElement);
    }
  }

  ngOnChanges(_c: SimpleChanges): void {
    if (this.listo) this.dibujar();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.mapa?.remove();
    this.mapa = undefined;
  }

  private dibujar(): void {
    if (!this.mapa || !this.capa) return;
    this.capa.clearLayers();

    const colores = new Map<string, string>();
    const etiquetas: string[] = [];
    const bounds: L.LatLngExpression[] = [];

    this.puntos.forEach((p, i) => {
      if (typeof p.lat !== 'number' || typeof p.lon !== 'number') return;
      const t = p.t ?? '—';
      if (!colores.has(t)) {
        colores.set(t, this.colorDe(t, colores.size, Math.max(this.puntos.length / 40, 8)));
        etiquetas.push(t);
      }
      const color = colores.get(t)!;
      bounds.push([p.lat, p.lon]);
      const popup = `<strong>${t}</strong>${p.meta ? `<br/>${p.meta}` : ''}<br/>Lat ${p.lat.toFixed(4)}, Lon ${p.lon.toFixed(4)}`;
      L.circleMarker([p.lat, p.lon], {
        radius: this.radio,
        color: '#ffffff',
        weight: 0.6,
        fillColor: color,
        fillOpacity: 0.75,
      })
        .bindPopup(popup)
        .bindTooltip(t, { direction: 'top', opacity: 0.9 })
        .addTo(this.capa!);
    });

    this.territorios.forEach((t, i) => {
      const color = this.colorDe(t.id, i, Math.max(this.territorios.length, 1));
      colores.set(t.id, color);
      bounds.push([t.lat, t.lon]);
      L.circleMarker([t.lat, t.lon], {
        radius: 8,
        color: '#0b2a3d',
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindPopup(
          `<strong>Territorio ${t.id}</strong><br/>${t.n} puntos<br/>${t.visitas} visitas/mes<br/>Lat ${t.lat.toFixed(4)}, Lon ${t.lon.toFixed(4)}`,
        )
        .bindTooltip(`Centroide ${t.id}`, { direction: 'top', opacity: 0.95 })
        .addTo(this.capa!);
    });

    if (bounds.length) {
      this.mapa.fitBounds(L.latLngBounds(bounds), { padding: [26, 26], maxZoom: 12 });
    }

    // leyenda (si no viene explícita, la derivamos de lo dibujado)
    if (!this.leyenda && etiquetas.length) {
      this.leyendaCalculada = {
        titulo: this.territorios.length ? 'Territorios' : 'Categorías',
        items: etiquetas.slice(0, 14).map((t) => ({ label: t, color: colores.get(t)! })),
      };
    } else if (this.leyenda) {
      this.leyendaCalculada = this.leyenda;
    }
  }

  leyendaCalculada: Leyenda | null = null;
}
