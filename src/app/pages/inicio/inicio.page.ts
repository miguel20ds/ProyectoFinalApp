import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonCard, IonCardContent, IonButton } from '@ionic/angular';
import { Browser } from '@capacitor/browser';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  imports: [IonContent, IonCard, IonCardContent, IonButton],
})
export class InicioPage {
  private router = inject(Router);

  abrir(url: string) {
    Browser.open({ url });
  }

  ingresar() {
    this.router.navigate(['/login']);
  }
}