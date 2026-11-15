import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Browser } from '@capacitor/browser';
import { IonContent, IonCard, IonCardContent, IonButton } from '@ionic/angular';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  imports: [IonContent, IonCard, IonCardContent, IonButton],
})
export class InicioPage {
  private router = inject(Router);

  abrir(url: string): void {
    Browser.open({ url });
  }

  ingresar(): void {
    this.router.navigate(['/login']);
  }
}
