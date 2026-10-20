import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/formato';
import type { ChatSalud } from '../../core/models';
import { ChipColoridaComponent } from '../../shared/chip-colorida.component';

interface Mensaje {
  rol: 'usuario' | 'asistente';
  texto: string;
  herramientas?: string[];
  incidencias?: string[];
  privacidadOk?: boolean;
  error?: boolean;
}

const CLAVE_SESION = 'ruteo_hijos_leon_sesion';

@Component({
  selector: 'app-asistente',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ChipColoridaComponent,
  ],
  templateUrl: './asistente.component.html',
  styleUrl: './asistente.component.scss',
})
export class AsistenteComponent implements OnInit, AfterViewChecked {
  private readonly api = inject(ApiService);
  @ViewChild('scroll') private scroll?: ElementRef<HTMLDivElement>;

  readonly mensajes = signal<Mensaje[]>([]);
  readonly texto = signal('');
  readonly enviando = signal(false);
  readonly saludLlm = signal<ChatSalud | null>(null);
  readonly sesion = signal('');

  readonly ejemplos = [
    '¿Cuántos clientes y visitas tiene el universo?',
    '¿Cuántas zonas rutable hay y cuáles se perdieron?',
    '¿Cuánto cuesta el escenario ACTUAL y es factible?',
    '¿Qué alternativa gana, A (NN) o B (ACO)?',
    '¿Cómo cambia el costo si paso de 50 a 58 asesores?',
  ];

  private deboBajar = false;

  ngOnInit(): void {
    let sesion = localStorage.getItem(CLAVE_SESION);
    if (!sesion) {
      sesion = 'ses-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(CLAVE_SESION, sesion);
    }
    this.sesion.set(sesion);

    this.api.chatSalud().subscribe({
      next: (s) => this.saludLlm.set(s),
      error: () => this.saludLlm.set(null),
    });

    this.mensajes.set([
      {
        rol: 'asistente',
        texto:
          'Hola 👋 Soy el asistente de ruteo de Hijos de León. Pregúntame por clientes, zonas, costos, factibilidad o comparaciones de estrategias. Trabajo sólo con datos agregados.',
        herramientas: [],
        privacidadOk: true,
      },
    ]);
  }

  ngAfterViewChecked(): void {
    if (this.deboBajar) {
      const el = this.scroll?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
      this.deboBajar = false;
    }
  }

  get llmConfigurado(): boolean {
    return !!this.saludLlm()?.configurado;
  }

  enviar(pregunta?: string): void {
    const q = (pregunta ?? this.texto()).trim();
    if (!q || this.enviando()) return;

    this.texto.set('');
    this.mensajes.update((m) => [...m, { rol: 'usuario', texto: q }]);
    this.deboBajar = true;
    this.enviando.set(true);

    this.api.chat(q, this.sesion()).subscribe({
      next: (r) => {
        this.mensajes.update((m) => [
          ...m,
          {
            rol: 'asistente',
            texto: r.respuesta ?? '(sin respuesta)',
            herramientas: r.herramientas ?? [],
            incidencias: r.incidencias ?? [],
            privacidadOk: r.privacidad_ok,
          },
        ]);
        this.enviando.set(false);
        this.deboBajar = true;
      },
      error: (err) => {
        this.mensajes.update((m) => [
          ...m,
          {
            rol: 'asistente',
            texto:
              'No pude responder en este momento. ' +
              mensajeError(err) +
              ' Verifique que la variable LLM_API_KEY esté configurada en el archivo .env del backend.',
            herramientas: [],
            error: true,
            privacidadOk: true,
          },
        ]);
        this.enviando.set(false);
        this.deboBajar = true;
      },
    });
  }

  usarEjemplo(e: string): void {
    this.enviar(e);
  }
}
