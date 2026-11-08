import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent, IonCard, IonCardContent, IonSpinner, IonButton, IonHeader, IonToolbar,
  IonButtons, IonSegment, IonSegmentButton, IonLabel, AlertController, ToastController,
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { ETIQUETA_ESTADO, Reserva, ReservaService } from '../../services/reserva.service';

type Filtro = 'todas' | Reserva['estado'];

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['../mis-reservas/mis-reservas.page.scss', './admin.page.scss'],
  imports: [
    DatePipe, IonContent, IonCard, IonCardContent, IonSpinner, IonButton, IonHeader,
    IonToolbar, IonButtons, IonSegment, IonSegmentButton, IonLabel,
  ],
})
export class AdminPage {
  private api = inject(ReservaService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  etiqueta = ETIQUETA_ESTADO;
  reservas = signal<Reserva[]>([]);
  cargando = signal(true);
  fallo = signal(false);
  filtro = signal<Filtro>('pendiente');

  visibles = computed(() => {
    const f = this.filtro();
    return f === 'todas' ? this.reservas() : this.reservas().filter((r) => r.estado === f);
  });

  async ionViewWillEnter() {
    this.cargando.set(true);
    this.fallo.set(false);
    try {
      this.reservas.set(await this.api.todas());
    } catch (e) {
      console.error(e);
      this.fallo.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarFiltro(ev: Event) {
    this.filtro.set((ev as CustomEvent).detail.value as Filtro);
  }

  async entregar(r: Reserva) {
    const alert = await this.alertCtrl.create({
      header: 'Marcar como entregado',
      message: `¿Entregaste "${r.producto_titulo}" a ${r.profiles?.nombre ?? 'el cliente'}?`,
      buttons: [
        { text: 'No', role: 'cancel' },
        { text: 'Sí, entregado', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') return;

    try {
      await this.api.marcarEntregado(r.id);
      this.reservas.update((l) =>
        l.map((x) => (x.id === r.id ? { ...x, estado: 'entregado' as const } : x)),
      );
      await this.toast('Reserva marcada como entregada');
    } catch (e) {
      console.error(e);
      await this.toast('No se pudo actualizar (quizá el cliente la canceló)');
      await this.ionViewWillEnter();
    }
  }

  async salir() {
    await this.auth.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2500, cssClass: 'toast-aroma' });
    await t.present();
  }
}