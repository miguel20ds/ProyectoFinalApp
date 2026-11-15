import { CurrencyPipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, computed, effect, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Capacitor } from '@capacitor/core';
import { AlertController, ToastController, IonButton, IonSpinner } from '@ionic/angular';

import type { ConsultaProductos, Producto, ProductoEdicion } from '../../models/producto';
import { TAMANO_PAGINA } from '../../models/producto';
import { AuthService } from '../../services/auth.service';
import type { BorradorProducto } from '../../services/producto-borrador.service';
import { ProductoBorradorService } from '../../services/producto-borrador.service';
import { ProductoService } from '../../services/producto.service';
import { imagenProducto, ImagenProductoPipe } from '../../shared/presentacion';

@Component({
  selector: 'app-productos-admin',
  templateUrl: './productos-admin.component.html',
  styleUrls: ['./productos-admin.component.scss'],
  imports: [FormsModule, ReactiveFormsModule, CurrencyPipe, ImagenProductoPipe, IonButton, IonSpinner],
})
export class ProductosAdminComponent implements OnInit {
  private api = inject(ProductoService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  borrador = inject(ProductoBorradorService);
  productos = signal<Producto[]>([]);
  total = signal(0);
  cargando = signal(false);
  guardando = signal(false);
  seleccionando = signal(false);
  editor = signal(false);
  error = signal('');
  mensaje = signal('');
  id: string | null = null;
  imagenRuta: string | null = null;
  origen: Producto | null = null;
  busqueda = '';
  estado: ConsultaProductos['estado'] = 'todos';
  pagina = 0;
  tamanoPagina = TAMANO_PAGINA;
  private solicitud = 0;

  form = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(160)]),
    marca: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    descripcion: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(4000)]),
    presentacion: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    precio_cop: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(999999999999.99),
    ]),
    activo: this.fb.nonNullable.control(false),
  });

  vistaPrevia = computed(() => {
    const actual = this.borrador.borrador();
    if (!actual || actual.usuarioId !== this.auth.usuario()?.id) return '';
    const foto = actual.foto;
    return (
      foto?.webPath || (foto?.uri ? Capacitor.convertFileSrc(foto.uri) : imagenProducto(actual.valores.imagen_ruta))
    );
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.editor()) void this.persistir().catch(() => this.error.set('No se pudo conservar el borrador.'));
    });
    effect(() => {
      const actual = this.borrador.borrador();
      const usuarioId = this.auth.usuario()?.id;
      if (!usuarioId || (actual && actual.usuarioId !== usuarioId)) {
        if (this.editor()) {
          this.editor.set(false);
          this.form.reset(undefined, { emitEvent: false });
          this.id = null;
          this.imagenRuta = null;
          this.origen = null;
        }
        return;
      }
      if (actual && (this.borrador.restaurado() || !this.editor())) {
        this.abrirBorrador(actual);
        this.borrador.restaurado.set(false);
        this.mensaje.set('Recuperamos tu formulario. Revisa la foto antes de guardar.');
      }
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      await Promise.all([this.auth.listo, this.borrador.listo]);
      const actual = this.borrador.borrador();
      if (actual && actual.usuarioId === this.auth.usuario()?.id) {
        this.abrirBorrador(actual);
        this.mensaje.set('Tienes un borrador pendiente. Puedes continuarlo o descartarlo.');
      }
      await this.cargar();
    } catch {
      this.error.set('No se pudo recuperar el borrador. Puedes reintentar la carga.');
    }
  }

  private abrirBorrador(actual: BorradorProducto) {
    this.id = actual.id;
    this.imagenRuta = actual.valores.imagen_ruta;
    this.form.reset(actual.valores, { emitEvent: false });
    this.editor.set(true);
  }

  async cargar(reiniciar = false): Promise<void> {
    if (reiniciar) this.pagina = 0;
    const solicitud = ++this.solicitud;
    this.cargando.set(true);
    this.error.set('');
    try {
      const resultado = await this.api.listar({ pagina: this.pagina, busqueda: this.busqueda, estado: this.estado });
      if (solicitud !== this.solicitud) return;
      this.productos.set(resultado.productos);
      this.total.set(resultado.total);
    } catch {
      if (solicitud === this.solicitud) {
        this.productos.set([]);
        this.error.set('No se pudieron cargar los perfumes. Reintenta la carga.');
      }
    } finally {
      if (solicitud === this.solicitud) this.cargando.set(false);
    }
  }

  async editar(producto?: Producto): Promise<void> {
    if (this.editor()) return;
    this.id = producto?.id ?? null;
    this.imagenRuta = producto?.imagen_ruta ?? null;
    this.origen = producto ?? null;
    this.form.reset(
      {
        nombre: producto?.nombre ?? '',
        marca: producto?.marca ?? '',
        descripcion: producto?.descripcion ?? '',
        presentacion: producto?.presentacion ?? '',
        precio_cop: producto?.precio_cop ?? null,
        activo: producto?.activo ?? false,
      },
      { emitEvent: false },
    );
    this.editor.set(true);
    this.error.set('');
    this.mensaje.set('');
    await this.persistir(false);
  }

  private persistir(conservarFoto = true) {
    const usuario = this.auth.usuario();
    if (!usuario) return Promise.reject(new Error('Sesión no disponible'));
    const actual = this.borrador.borrador();
    const foto = conservarFoto && actual?.usuarioId === usuario.id ? actual.foto : undefined;
    return this.borrador.guardar({
      usuarioId: usuario.id,
      id: this.id,
      valores: { ...this.form.getRawValue(), imagen_ruta: this.imagenRuta },
      foto,
    });
  }

  async seleccionar(origen: 'camara' | 'galeria'): Promise<void> {
    this.seleccionando.set(true);
    try {
      await this.persistir();
      await this.borrador.seleccionar(origen);
    } catch {
      this.error.set('No se pudo conservar el formulario antes de abrir la cámara.');
    } finally {
      this.seleccionando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.guardando() || this.seleccionando()) return;
    this.form.markAllAsTouched();
    const valores: ProductoEdicion = {
      ...this.form.getRawValue(),
      nombre: this.form.controls.nombre.value.trim(),
      imagen_ruta: this.imagenRuta,
    };
    const campos = [
      ['nombre', 'Nombre'],
      ['marca', 'Marca'],
      ['descripcion', 'Descripción'],
      ['presentacion', 'Presentación'],
    ] as const;
    for (const [campo, etiqueta] of campos) {
      valores[campo] = valores[campo].trim();
      if (!valores[campo]) {
        await this.mostrarValidacion(`El campo ${etiqueta} es obligatorio. Debes completarlo.`);
        return;
      }
    }
    if (valores.precio_cop === null || valores.precio_cop === undefined) {
      await this.mostrarValidacion('El campo Precio en COP es obligatorio. Debes completarlo.');
      return;
    }
    const foto = this.borrador.borrador()?.foto;
    if (!foto && !this.imagenRuta) {
      await this.mostrarValidacion('La imagen del perfume es obligatoria. Debes seleccionar una foto.');
      return;
    }
    if (
      this.form.invalid ||
      !valores.nombre ||
      (valores.activo && (!valores.precio_cop || (!foto && !this.imagenRuta)))
    ) {
      await this.mostrarValidacion(
        'Revisa los campos: el precio debe ser positivo y los textos deben respetar la longitud máxima.',
      );
      return;
    }
    this.guardando.set(true);
    this.error.set('');
    try {
      let imagen: Blob | undefined;
      if (foto) {
        const ruta = foto.webPath || (foto.uri ? Capacitor.convertFileSrc(foto.uri) : '');
        if (!ruta) throw new Error('Vuelve a seleccionar la imagen.');
        const respuesta = await fetch(ruta);
        if (!respuesta.ok) throw new Error('No se pudo leer la imagen. Vuelve a seleccionarla.');
        const blob = await respuesta.blob();
        const formato = foto.metadata?.format?.toLowerCase();
        imagen = blob.type
          ? blob
          : new Blob([blob], { type: `image/${formato === 'jpg' ? 'jpeg' : (formato ?? 'jpeg')}` });
      }
      await this.api.guardar(this.id, valores, imagen);
      this.editor.set(false);
      try {
        await this.borrador.guardar(null);
      } catch {
        this.error.set('Perfume guardado. No se pudo limpiar el borrador del dispositivo.');
      }
      this.mensaje.set('Perfume guardado.');
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo guardar. Revisa tu conexión y tus permisos.');
    } finally {
      this.guardando.set(false);
    }
  }

  private async mostrarValidacion(message: string): Promise<void> {
    this.error.set(message);
    const toast = await this.toastCtrl.create({
      message,
      duration: 3500,
      position: 'bottom',
      cssClass: 'toast-aroma',
    });
    await toast.present();
  }
  async descartar(): Promise<void> {
    await this.borrador.guardar(null);
    this.editor.set(false);
    this.borrador.error.set('');
    this.error.set('');
    this.mensaje.set('');
  }

  async toggle(producto: Producto): Promise<void> {
    if (!producto.activo && (!producto.precio_cop || !producto.imagen_ruta)) {
      await this.editar(producto);
      this.error.set('Asigna precio COP e imagen antes de publicar.');
      return;
    }
    this.guardando.set(true);
    try {
      await this.api.activar(producto, !producto.activo);
      await this.cargar();
    } catch {
      this.error.set('No se pudo cambiar la disponibilidad del perfume.');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(producto: Producto): Promise<void> {
    if (this.editor() || this.guardando()) return;
    const alerta = await this.alertCtrl.create({
      header: 'Eliminar perfume',
      subHeader: producto.nombre,
      message: 'El perfume se eliminará definitivamente del catálogo. Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'confirm' },
      ],
    });
    await alerta.present();
    const { role } = await alerta.onDidDismiss();
    if (role !== 'confirm' || this.guardando() || this.editor()) return;
    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');
    try {
      await this.api.eliminar(producto);
      this.mensaje.set('Perfume eliminado.');
      await this.cargar(true);
    } catch (error) {
      const codigo = (error as { code?: string })?.code;
      this.error.set(
        codigo === '23503'
          ? 'Este perfume tiene reservas asociadas. Puedes desactivarlo para retirarlo del catálogo y conservar el historial.'
          : 'No se pudo eliminar el perfume. Revisa tu conexión y los permisos de eliminación.',
      );
    } finally {
      this.guardando.set(false);
    }
  }
  cambiarPagina(delta: number): void {
    this.pagina += delta;
    void this.cargar();
  }
}
