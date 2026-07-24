import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/compare/compare').then((module) => module.Compare),
  },
];
