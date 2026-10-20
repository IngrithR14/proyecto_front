import { Routes } from '@angular/router';

/** Rutas con lazy loading (loadComponent) de las 5 secciones. */
export const routes: Routes = [
  {
    path: '',
    title: 'Inicio · Ruteo Hijos de León',
    loadComponent: () =>
      import('./pages/inicio/inicio.component').then((m) => m.InicioComponent),
  },
  {
    path: 'eda',
    title: 'EDA · Ruteo Hijos de León',
    loadComponent: () => import('./pages/eda/eda.component').then((m) => m.EdaComponent),
  },
  {
    path: 'ruteo',
    title: 'Modelo de ruteo · Ruteo Hijos de León',
    loadComponent: () =>
      import('./pages/ruteo/ruteo.component').then((m) => m.RuteoComponent),
  },
  {
    path: 'montecarlo',
    title: 'MonteCarlo · Ruteo Hijos de León',
    loadComponent: () =>
      import('./pages/montecarlo/montecarlo.component').then((m) => m.MonteCarloComponent),
  },
  {
    path: 'asistente',
    title: 'Asistente · Ruteo Hijos de León',
    loadComponent: () =>
      import('./pages/asistente/asistente.component').then((m) => m.AsistenteComponent),
  },
  { path: '**', redirectTo: '' },
];
