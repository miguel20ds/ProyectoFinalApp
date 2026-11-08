import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';


export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo;
  return auth.usuario() ? true : router.createUrlTree(['/login']);
};


export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo;
  const u = auth.usuario();
  if (!u) return router.createUrlTree(['/login']);
  return u.rol === 'admin' ? true : router.createUrlTree(['/catalogo']);
};