import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonContent, IonCard, IonCardContent, IonSpinner, IonButton,
  IonHeader, IonToolbar, IonButtons, IonBackButton,
  AlertController, ToastController,
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Reserva, ReservaService, ETIQUETA_ESTADO } from '../../services/reserva.service';

@Component({
  selector: 'app-mis-reservas',
  templateUrl: './mis-reservas.page.html',
  styleUrls: ['./mis-reservas.page.scss'],
  imports: [
    DatePipe, IonContent, IonCard, IonCardContent, IonSpinner, IonButton,
    IonHeader, IonToolbar, IonButtons, IonBackButton,
  ],
})
export class MisReservasPage {
  private auth = inject(AuthService);
  private api = inject(ReservaService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  etiqueta = ETIQUETA_ESTADO;
  reservas = signal<Reserva[]>([]);
  cargando = signal(true);
  fallo = signal(false);

  async ionViewWillEnter() {
    const u = this.auth.usuario();
    if (!u) return;
    this.cargando.set(true);
    this.fallo.set(false);
    try {
      this.reservas.set(await this.api.misReservas(u.id));
    } catch (e) {
      console.error(e);
      this.fallo.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  async cancelar(r: Reserva) {
    const alert = await this.alertCtrl.create({
      header: 'Cancelar reserva',
      message: `¿Seguro que quieres cancelar la reserva de "${r.producto_titulo}"?`,
      buttons: [
        { text: 'No', role: 'cancel' },
        { text: 'Sí, cancelar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') return;

    try {
      await this.api.cancelar(r.id);
      this.reservas.update((lista) =>
        lista.map((x) => (x.id === r.id ? { ...x, estado: 'cancelada' as const } : x)),
      );
      await this.toast('Reserva cancelada');
    } catch (e) {
      console.error(e);
      await this.toast('No se pudo cancelar. Puede que ya haya sido entregada');
      await this.ionViewWillEnter(); // refresca el estado real
    }
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2500, cssClass: 'toast-aroma' });
    await t.present();
  }
}