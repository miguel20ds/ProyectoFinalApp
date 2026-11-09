import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';


export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo;
  const u = auth.usuario();
  return u && !u.bloqueado ? true : router.createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo;
  const u = auth.usuario();
  if (!u || u.bloqueado) return router.createUrlTree(['/login']);
  return u.rol === 'admin' ? true : router.createUrlTree(['/catalogo']);
};