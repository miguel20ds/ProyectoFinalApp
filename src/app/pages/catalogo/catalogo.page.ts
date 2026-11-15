import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonButton,
  IonSpinner,
  ToastController,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  AlertController,
} from '@ionic/angular';

import type { ConsultaProductos, Producto } from '../../models/producto';
import { TAMANO_PAGINA } from '../../models/producto';
import { AuthService } from '../../services/auth.service';
import { ProductoService } from '../../services/producto.service';
import { ReservaService } from '../../services/reserva.service';
import { ImagenProductoPipe } from '../../shared/presentacion';

@Component({
  selector: 'app-catalogo',
  templateUrl: './catalogo.page.html',
  styleUrls: ['./catalogo.page.scss'],
  imports: [
    FormsModule,
    CurrencyPipe,
    ImagenProductoPipe,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonSpinner,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
  ],
})
export class CatalogoPage {
  private api = inject(ProductoService);
  private toastCtrl = inject(ToastController);

  private reservas = inject(ReservaService);
  private alertCtrl = inject(AlertController);
  private router = inject(Router);

  private auth = inject(AuthService);
  nombre = computed(() => this.auth.usuario()?.nombre ?? 'Usuario');

  productos = signal<Producto[]>([]);
  cargando = signal(true);
  fallo = signal(false);
  total = signal(0);
  pagina = 0;
  busqueda = '';
  orden: ConsultaProductos['orden'] = 'nombre';
  tamanoPagina = TAMANO_PAGINA;
  private solicitud = 0;

  ionViewWillEnter(): void {
    void this.cargar();
  }

  async confirmarReserva(p: Producto): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Reservar perfume',
      message: `¿Quieres reservar "${p.nombre}" por ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(p.precio_cop ?? 0)} COP?`,
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
      await this.toast(e?.code === '23505' ? 'Ya tienes este perfume reservado (pendiente)' : 'No se pudo reservar');
    }
  }

  irAMisReservas(): void {
    this.router.navigate(['/mis-reservas']);
  }

  async salir(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2500, cssClass: 'toast-aroma' });
    await t.present();
  }

  async cargar(reiniciar = false): Promise<void> {
    if (reiniciar) this.pagina = 0;
    const solicitud = ++this.solicitud;
    this.cargando.set(true);
    this.fallo.set(false);
    try {
      const resultado = await this.api.listar({ pagina: this.pagina, busqueda: this.busqueda, orden: this.orden });
      if (solicitud !== this.solicitud) return;
      this.productos.set(resultado.productos);
      this.total.set(resultado.total);
    } catch {
      if (solicitud === this.solicitud) {
        this.fallo.set(true);
        this.productos.set([]);
      }
    } finally {
      if (solicitud === this.solicitud) this.cargando.set(false);
    }
  }

  cambiarPagina(delta: number): void {
    this.pagina += delta;
    void this.cargar();
  }
}
