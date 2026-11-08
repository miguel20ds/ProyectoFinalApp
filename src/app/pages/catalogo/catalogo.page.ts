import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { IonContent, IonCard, IonCardContent, IonButton, IonSpinner, ToastController, IonHeader, IonToolbar, IonButtons, IonBackButton,  } from '@ionic/angular';
import { Producto } from '../../models/producto';
import { ProductoService } from '../../services/producto.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ReservaService } from '../../services/reserva.service';

@Component({
  selector: 'app-catalogo',
  templateUrl: './catalogo.page.html',
  styleUrls: ['./catalogo.page.scss'],
  imports: [IonContent, IonCard, IonCardContent, IonButton, IonSpinner, IonHeader, IonToolbar, IonButtons, IonBackButton,],
})
export class CatalogoPage implements OnInit {
  private api = inject(ProductoService);
  private toastCtrl = inject(ToastController);

  private reservas = inject(ReservaService);
  private alertCtrl = inject(AlertController);
  private router = inject(Router);

  private auth = inject(AuthService);
  nombre = computed(() => this.auth.usuario()?.nombre ?? 'Usuario');

  productos= signal<Producto[]>([]);
  cargando = signal(true);

  ngOnInit() {
    this.cargar();
  }

  async confirmarReserva(p: Producto) {
    const alert = await this.alertCtrl.create({
      header: 'Reservar perfume',
      message: `¿Quieres reservar "${p.title}" por $${p.price}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Reservar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') return;

    try {
      await this.reservas.reservar(p);
      await this.toast('¡Reservado! Míralo en "Mis reservas"');
    } catch (e: any) {
      console.error(e);
      await this.toast(
        e?.code === '23505' ? 'Ya tienes este perfume reservado (pendiente)' : 'No se pudo reservar',
      );
    }
  }

  irAMisReservas() {
    this.router.navigate(['/mis-reservas']);
  }

  async salir() {
    await this.auth.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2500, cssClass: 'toast-aroma' });
    await t.present();
  }

  cargar() {
    this.cargando.set(true);
    this.api.getFragancias().subscribe({
      next: (r) => {
        this.productos.set(r.products);
        this.cargando.set(false);
      },
      error: async (e) => {
        this.cargando.set(false);
        const toast = await this.toastCtrl.create({
          message: `Error al cargar los productos: ${e.message}`,
          duration: 3500,
          cssClass: 'toast-aroma',
        });
        await toast.present();
      },
    });
  }
}