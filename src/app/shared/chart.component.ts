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
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(...registerables, ChartDataLabels);
// Los datalabels se activan explícitamente por gráfica (opc-in).
Chart.defaults.set('plugins.datalabels', { display: false });
Chart.defaults.font.family = 'Roboto, system-ui, sans-serif';
Chart.defaults.color = '#546e7a';

/**
 * Wrapper propio de Chart.js: recibe `type`, `data` y `options`
 * y (re)dibuja la gráfica cuando cambian. Sin imágenes estáticas.
 */
@Component({
  selector: 'app-chart',
  standalone: true,
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss',
})
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  @Input() type: ChartType = 'bar';
  @Input() data: ChartConfiguration['data'] = { datasets: [] };
  @Input() options: ChartConfiguration['options'] = {};
  @Input() height = 300;
  @Input() plugins: ChartConfiguration['plugins'] = [];

  private chart?: Chart;
  private listo = false;

  ngAfterViewInit(): void {
    this.listo = true;
    this.render();
  }

  ngOnChanges(_c: SimpleChanges): void {
    if (this.listo) this.render();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = undefined;
  }

  private render(): void {
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;
    this.chart?.destroy();
    // clonamos para que Chart.js no mute los objetos de entrada
    const data = JSON.parse(JSON.stringify(this.data ?? { datasets: [] }));
    this.chart = new Chart(ctx, {
      type: this.type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 450 },
        ...(this.options ?? {}),
      },
      plugins: this.plugins ?? [],
    });
  }
}
