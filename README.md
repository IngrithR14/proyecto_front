# proyecto_front — Dashboard de ruteo "Distribuidora Hijos de León"

Frontend **Angular 22 (standalone components, signals)** para la API FastAPI de ruteo de asesores
(`/home/ingrith/Documentos/proyecto_especializacion/proyecto_back`).

Cuatro áreas: **EDA** (perfil y distribuciones), **Modelo de ruteo** (NN vs ACO),
**MonteCarlo** (número de asesores K) y **Asistente** (chatbot LLM).

> **Privacidad**: el dashboard y el chat nunca muestran datos personales (cédulas, nombres,
> direcciones). Sólo agregados y coordenadas; el aviso está en cada sección.

## Requisitos

- Node.js ≥ 20 y npm
- Backend FastAPI corriendo en `http://127.0.0.1:8000`

## Instalar y correr

```bash
cd proyecto_front
npm install        # la primera vez
npm start          # ng serve --proxy-config proxy.conf.json --port 4200
```

Abra <http://localhost:4200>.

El `proxy.conf.json` de la raíz reenvía `/api/*` a `http://127.0.0.1:8000`, así que no hay CORS
y no hay que tocar la URL base en el código (`ApiService` usa rutas relativas `/api/...`).

## Compilar

```bash
npm run build      # producción → dist/proyecto_front
```

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Angular 22 (standalone, `loadComponent` en rutas, `provideHttpClient`) |
| UI | Angular Material 3 (tema claro, paleta azure + spring-green) + Bootstrap 5 (grilla/utilidades) |
| Gráficas | Chart.js 4 + `chartjs-plugin-datalabels` con wrapper propio (`app-chart`) |
| Mapas | Leaflet + tiles OpenStreetMap (`app-mapa-leaflet`) |
| Proxy | `proxy.conf.json` → FastAPI 127.0.0.1:8000, puerto 4200 |

## Estructura

```
src/app/
├── app.ts / app.html / app.scss      # shell: toolbar con barra de estado + sidenav + footer
├── app.routes.ts                     # rutas lazy (loadComponent)
├── app.config.ts                     # provideRouter + provideHttpClient
├── core/
│   ├── api.service.ts                # todas las llamadas a /api/... + manejo de 503
│   ├── models.ts                     # interfaces del contrato de la API
│   ├── formato.ts                    # formato es-CO (enteros, %, M COP, cuantiles…)
│   └── paleta.ts                     # colores de categorías, rampas y leyendas
├── shared/
│   ├── chart.component.ts            # wrapper Chart.js (type/data/options)
│   ├── mapa-leaflet.component.ts     # mapa OSM con puntos + centroides + leyenda
│   ├── kpi-card.component.ts         # tarjeta KPI
│   ├── chip-colorida.component.ts    # chips de estado (factible, supuesto…)
│   ├── carga-estado.component.ts     # spinner / "calculando…" / error
│   └── privacidad-footer.component.ts
└── pages/
    ├── eda/                          # distribuciones, histogramas, carga por zona, correlaciones
    ├── ruteo/                        # NN vs ACO: tabla, caja y bigotes, Wilcoxon
    ├── montecarlo/                   # slider K 35–70, paneles, tabla comparativa, gráficas, mapa
    └── asistente/                    # chat estilo messenger con chips de herramientas
```

## Sección MonteCarlo

- Slider **K = 35 … 70** (el backend precalcula por bloques: puede responder `503` para algunas K).
- Panel de la K seleccionada: costo medio + IC95, km, cobertura, pico de carga, días sobre CAP,
  factibilidad y desglose de costo (doughnut).
- Tabla comparativa con Δ vs ACTUAL (K = 58) y sus IC95, resaltando mínima factible / mejor
  factible / más barata.
- Gráficas: costo medio vs K con banda IC95 y línea ACTUAL; pico de carga vs K con línea del
  CAP = 44.
- Mapa de territorios de la K seleccionada (si `geo` aún no está precalculado se muestra el de
  `actual` con una nota, o un mensaje).

## Manejo del backend

`ApiService` traduce el **HTTP 503** ("aún no precalculado") a `BackendNoListoError` y cada
sección muestra un spinner con el mensaje *"Calculando…"* o una tarjeta de "dato aún no
disponible". El chat muestra el aviso de `LLM_API_KEY` si el LLM no está configurado
(`GET /api/chat/salud`).
