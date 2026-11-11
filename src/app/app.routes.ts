import { Routes } from '@angular/router';

/** Rutas con lazy loading (loadComponent) de las 4 secciones (el EDA es la raíz). */
export const routes: Routes = [
  {
    path: '',
    title: 'EDA · Ruteo Hijos de León',
    loadComponent: () => import('./pages/eda/eda.component').then((m) => m.EdaComponent),
  },
  {
    // Alias: conserva enlaces y favoritos a /eda.
    path: 'eda',
    redirectTo: '',
    pathMatch: 'full',
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
