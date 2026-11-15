import { Injectable, signal } from '@angular/core';
import type { RestoredListenerEvent } from '@capacitor/app';
import { App } from '@capacitor/app';
import type { MediaResult } from '@capacitor/camera';
import { Camera, MediaTypeSelection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

import type { ProductoEdicion } from '../models/producto';

export interface BorradorProducto {
  usuarioId: string;
  id: string | null;
  valores: ProductoEdicion;
  foto?: MediaResult;
}
const CLAVE = 'producto-borrador-v1';

@Injectable({ providedIn: 'root' })
export class ProductoBorradorService {
  borrador = signal<BorradorProducto | null>(null);
  restaurado = signal(false);
  error = signal('');
  private cola: Promise<void> = Promise.resolve();
  readonly listo = this.inicializar();

  private async inicializar() {
    if (Capacitor.isNativePlatform()) {
      await App.addListener('appRestoredResult', (evento) =>
        this.recuperar(evento).catch(() => {
          this.error.set('No se pudo recuperar la imagen. Vuelve a seleccionarla.');
        }),
      );
    }
    const { value } = await Preferences.get({ key: CLAVE });
    if (value) {
      try {
        this.borrador.set(JSON.parse(value) as BorradorProducto);
      } catch {
        await Preferences.remove({ key: CLAVE });
      }
    }
  }

  guardar(borrador: BorradorProducto | null): Promise<void> {
    this.borrador.set(borrador);
    const value = borrador ? JSON.stringify(borrador) : null;
    this.cola = this.cola
      .catch(() => undefined)
      .then(async () => {
        if (value) await Preferences.set({ key: CLAVE, value });
        else await Preferences.remove({ key: CLAVE });
      });
    return this.cola;
  }

  async seleccionar(origen: 'camara' | 'galeria'): Promise<void> {
    await this.listo;
    this.error.set('');
    try {
      const foto =
        origen === 'camara'
          ? await Camera.takePhoto({
              quality: 85,
              targetWidth: 1600,
              targetHeight: 1600,
              saveToGallery: false,
              webUseInput: true,
              includeMetadata: true,
            })
          : (
              await Camera.chooseFromGallery({
                mediaType: MediaTypeSelection.Photo,
                allowMultipleSelection: false,
                includeMetadata: true,
              })
            ).results[0];
      const actual = this.borrador();
      if (foto && actual) await this.guardar({ ...actual, foto });
    } catch (error) {
      this.mostrarError(error);
    }
  }

  private async recuperar(evento: RestoredListenerEvent) {
    if (evento.pluginId !== 'Camera' || !['takePhoto', 'chooseFromGallery'].includes(evento.methodName)) return;
    await this.listo;
    if (!this.borrador()) return;
    if (evento.success) {
      const foto: MediaResult | undefined =
        evento.methodName === 'chooseFromGallery' ? evento.data?.results?.[0] : evento.data;
      if (foto) await this.guardar({ ...this.borrador()!, foto });
    } else this.mostrarError(evento.error);
    this.restaurado.set(true);
  }

  private mostrarError(error: unknown) {
    const detalle = (error ?? {}) as { code?: string; message?: string };
    if (
      ['OS-PLUG-CAMR-0006', 'OS-PLUG-CAMR-0013', 'OS-PLUG-CAMR-0020'].includes(detalle.code ?? '') ||
      /cancel/i.test(detalle.message ?? '')
    )
      return;
    this.error.set(
      ['OS-PLUG-CAMR-0003', 'OS-PLUG-CAMR-0005'].includes(detalle.code ?? '')
        ? 'Permite el acceso a la cámara o a las fotos en Ajustes de tu dispositivo y vuelve a intentarlo.'
        : 'No se pudo abrir la imagen. Vuelve a seleccionarla o revisa los permisos en Ajustes.',
    );
  }
}
