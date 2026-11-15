import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonSpinner,
  IonButton,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSearchbar,
  IonBadge,
  AlertController,
  ToastController,
  ActionSheetController,
} from '@ionic/angular';

import type { Perfil } from '../../services/auth.service';
import { AuthService } from '../../services/auth.service';
import { ProductoBorradorService } from '../../services/producto-borrador.service';
import type { Reserva } from '../../services/reserva.service';
import { ETIQUETA_ESTADO, ReservaService } from '../../services/reserva.service';
import { UsuarioService } from '../../services/usuario.service';
import { ImagenProductoPipe, PrecioReservaPipe } from '../../shared/presentacion';

import { ProductosAdminComponent } from './productos-admin.component';

type FiltroReserva = 'todas' | Reserva['estado'];
type FiltroUsuario = 'todos' | 'cliente' | 'admin' | 'bloqueado';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['../mis-reservas/mis-reservas.page.scss', './admin.page.scss'],
  imports: [
    ProductosAdminComponent,
    ImagenProductoPipe,
    PrecioReservaPipe,
    DatePipe,
    IonContent,
    IonCard,
    IonCardContent,
    IonSpinner,
    IonButton,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSearchbar,
    IonBadge,
  ],
})
export class AdminPage {
  private api = inject(ReservaService);
  private usuarioService = inject(UsuarioService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);
  private borrador = inject(ProductoBorradorService);

  etiqueta = ETIQUETA_ESTADO;

  
  seccion = signal<'reservas' | 'usuarios' | 'productos'>('reservas');

  
  reservas = signal<Reserva[]>([]);
  cargandoReservas = signal(true);
  falloReservas = signal(false);
  filtroReserva = signal<FiltroReserva>('todas');
  busquedaReserva = signal<string>('');

  
  usuarios = signal<Perfil[]>([]);
  cargandoUsuarios = signal(false);
  falloUsuarios = signal(false);
  filtroUsuario = signal<FiltroUsuario>('todos');
  busquedaUsuario = signal<string>('');

  
  totalUsuarios = computed(() => this.usuarios().length);
  totalClientes = computed(() => this.usuarios().filter((u) => u.rol === 'cliente').length);
  totalAdmins = computed(() => this.usuarios().filter((u) => u.rol === 'admin').length);
  totalBloqueados = computed(() => this.usuarios().filter((u) => !!u.bloqueado).length);

  
  visibles = computed(() => {
    const f = this.filtroReserva();
    const query = this.busquedaReserva().toLowerCase().trim();

    return this.reservas().filter((r) => {
      const coincideFiltro = f === 'todas' || r.estado === f;
      if (!coincideFiltro) return false;
      if (!query) return true;

      const titulo = r.producto_titulo?.toLowerCase() ?? '';
      const cliente = r.profiles?.nombre?.toLowerCase() ?? '';
      const email = r.profiles?.email?.toLowerCase() ?? '';
      return titulo.includes(query) || cliente.includes(query) || email.includes(query);
    });
  });

  
  usuariosFiltrados = computed(() => {
    const f = this.filtroUsuario();
    const query = this.busquedaUsuario().toLowerCase().trim();

    return this.usuarios().filter((u) => {
      if (f === 'cliente' && u.rol !== 'cliente') return false;
      if (f === 'admin' && u.rol !== 'admin') return false;
      if (f === 'bloqueado' && !u.bloqueado) return false;

      if (!query) return true;
      const nombre = u.nombre?.toLowerCase() ?? '';
      const email = u.email?.toLowerCase() ?? '';
      return nombre.includes(query) || email.includes(query);
    });
  });

  async ionViewWillEnter(): Promise<void> {
    await this.borrador.listo;
    if (this.borrador.borrador()?.usuarioId === this.auth.usuario()?.id) this.seccion.set('productos');
    await Promise.all([this.cargarReservas(), this.cargarUsuarios()]);
  }

  cambiarSeccion(ev: Event): void {
    this.seccion.set((ev as CustomEvent).detail.value as 'reservas' | 'usuarios' | 'productos');
  }

  
  async cargarReservas(): Promise<void> {
    this.cargandoReservas.set(true);
    this.falloReservas.set(false);
    try {
      this.reservas.set(await this.api.todas());
    } catch (e) {
      console.error('Error al cargar reservas:', e);
      this.falloReservas.set(true);
    } finally {
      this.cargandoReservas.set(false);
    }
  }

  cambiarFiltroReserva(ev: Event): void {
    this.filtroReserva.set((ev as CustomEvent).detail.value as FiltroReserva);
  }

  onBuscarReserva(ev: any): void {
    this.busquedaReserva.set(ev?.target?.value ?? '');
  }

  async cambiarEstadoReserva(r: Reserva, nuevoEstado: Reserva['estado']): Promise<void> {
    if (r.estado === nuevoEstado) return;

    const nombreEstado = this.etiqueta[nuevoEstado];
    const alert = await this.alertCtrl.create({
      header: 'Confirmar cambio de estado',
      message: `¿Deseas cambiar el estado de la reserva de "${r.producto_titulo}" a "${nombreEstado}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          role: 'confirm',
          handler: async () => {
            try {
              await this.api.cambiarEstado(r.id, nuevoEstado);
              this.reservas.update((lista) =>
                lista.map((item) => (item.id === r.id ? { ...item, estado: nuevoEstado } : item)),
              );
              await this.toast(`Reserva actualizada a: ${nombreEstado}`);
            } catch (err) {
              console.error('Error al cambiar estado de reserva:', err);
              await this.toast('No se pudo actualizar el estado de la reserva');
              await this.cargarReservas();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async abrirMenuEstados(r: Reserva): Promise<void> {
    const sheet = await this.actionSheetCtrl.create({
      header: `Cambiar estado: ${r.producto_titulo}`,
      subHeader: `Estado actual: ${this.etiqueta[r.estado]}`,
      buttons: [
        {
          text: 'Marcar como Pendiente',
          role: r.estado === 'pendiente' ? 'selected' : undefined,
          handler: () => this.cambiarEstadoReserva(r, 'pendiente'),
        },
        {
          text: 'Marcar como Entregado',
          role: r.estado === 'entregado' ? 'selected' : undefined,
          handler: () => this.cambiarEstadoReserva(r, 'entregado'),
        },
        {
          text: 'Marcar como Cancelada',
          role: r.estado === 'cancelada' ? 'selected' : undefined,
          handler: () => this.cambiarEstadoReserva(r, 'cancelada'),
        },
        {
          text: 'Cerrar',
          role: 'cancel',
        },
      ],
    });
    await sheet.present();
  }

  
  async cargarUsuarios(): Promise<void> {
    this.cargandoUsuarios.set(true);
    this.falloUsuarios.set(false);
    try {
      this.usuarios.set(await this.usuarioService.listar());
    } catch (e) {
      console.error('Error al cargar usuarios:', e);
      this.falloUsuarios.set(true);
    } finally {
      this.cargandoUsuarios.set(false);
    }
  }

  cambiarFiltroUsuario(ev: Event): void {
    this.filtroUsuario.set((ev as CustomEvent).detail.value as FiltroUsuario);
  }

  onBuscarUsuario(ev: any): void {
    this.busquedaUsuario.set(ev?.target?.value ?? '');
  }

  async toggleBloqueo(u: Perfil): Promise<void> {
    const nuevoEstado = !u.bloqueado;
    const accion = nuevoEstado ? 'Bloquear' : 'Desbloquear';
    const advertencia = nuevoEstado
      ? `¿Estás seguro de bloquear a "${u.nombre}" (${u.email})? Se le impedirá iniciar sesión y se cerrará cualquier sesión activa.`
      : `¿Estás seguro de desbloquear a "${u.nombre}" (${u.email})? Podrá iniciar sesión nuevamente.`;

    const alert = await this.alertCtrl.create({
      header: `${accion} usuario`,
      message: advertencia,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: accion,
          role: 'confirm',
          handler: async () => {
            try {
              await this.usuarioService.setBloqueado(u.id, nuevoEstado);
              this.usuarios.update((lista) =>
                lista.map((item) => (item.id === u.id ? { ...item, bloqueado: nuevoEstado } : item)),
              );
              await this.toast(`Usuario ${u.nombre} ${nuevoEstado ? 'bloqueado' : 'desbloqueado'}`);
            } catch (err) {
              console.error('Error al actualizar bloqueo de usuario:', err);
              await this.toast('Error al actualizar estado del usuario. Verifica permisos de Supabase.');
              await this.cargarUsuarios();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async editarPerfilUsuario(u: Perfil): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Editar Usuario',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          placeholder: 'Nombre completo',
          value: u.nombre,
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: u.rol === 'cliente' ? 'Convertir en Admin' : 'Degradar a Cliente',
          handler: async (data) => {
            const nuevoRol = u.rol === 'cliente' ? 'admin' : 'cliente';
            await this.guardarEdicionUsuario(u, data.nombre?.trim() || u.nombre, nuevoRol);
          },
        },
        {
          text: 'Guardar Nombre',
          handler: async (data) => {
            const nuevoNombre = data.nombre?.trim();
            if (!nuevoNombre) {
              await this.toast('El nombre no puede estar vacío');
              return false;
            }
            await this.guardarEdicionUsuario(u, nuevoNombre, u.rol);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async guardarEdicionUsuario(u: Perfil, nombre: string, rol: 'cliente' | 'admin') {
    try {
      await this.usuarioService.actualizarPerfil(u.id, { nombre, rol });
      this.usuarios.update((lista) => lista.map((item) => (item.id === u.id ? { ...item, nombre, rol } : item)));
      await this.toast(`Usuario ${nombre} actualizado exitosamente`);
    } catch (err) {
      console.error('Error al guardar edición de usuario:', err);
      await this.toast('No se pudo guardar la información del usuario');
    }
  }

  
  async salir(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2500, cssClass: 'toast-aroma' });
    await t.present();
  }
}
