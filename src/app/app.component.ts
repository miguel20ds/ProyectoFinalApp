import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

import { AuthService } from './services/auth.service';
import { ProductoBorradorService } from './services/producto-borrador.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private borrador = inject(ProductoBorradorService);
  private auth = inject(AuthService);
  private router = inject(Router);

  constructor() {
    effect(() => {
      const usuario = this.auth.usuario();
      if (
        this.borrador.restaurado() &&
        usuario?.rol === 'admin' &&
        !usuario.bloqueado &&
        this.borrador.borrador()?.usuarioId === usuario.id
      ) {
        void this.router.navigate(['/admin']);
      }
    });
  }
}
