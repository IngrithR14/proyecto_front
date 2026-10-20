import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * Estado de carga compartido:
 *  - spinner mientras `cargando` es true (p. ej. backend calculando),
 *  - mensaje de error / "aún no precalculado" si hay error,
 *  - contenido real en caso contrario.
 */
@Component({
  selector: 'app-carga-estado',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule],
  templateUrl: './carga-estado.component.html',
  styleUrl: './carga-estado.component.scss',
})
export class CargaEstadoComponent {
  @Input() cargando = true;
  @Input() error: string | null = null;
  @Input() mensaje = 'Calculando… el backend está precalculando este resultado.';
  @Input() tituloError = 'Dato aún no disponible';
}
