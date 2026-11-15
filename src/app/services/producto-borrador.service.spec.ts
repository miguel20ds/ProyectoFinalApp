import { TestBed } from '@angular/core/testing';
import type { RestoredListenerEvent } from '@capacitor/app';
import { App } from '@capacitor/app';
import { Camera, MediaType } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { vi } from 'vitest';

import type { BorradorProducto } from './producto-borrador.service';
import { ProductoBorradorService } from './producto-borrador.service';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }) } }));
vi.mock('@capacitor/camera', () => ({
  Camera: { takePhoto: vi.fn(), chooseFromGallery: vi.fn() },
  MediaType: { Photo: 0 },
  MediaTypeSelection: { Photo: 0 },
}));
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('ProductoBorradorService', () => {
  let servicio: ProductoBorradorService;
  const borrador: BorradorProducto = {
    usuarioId: 'admin',
    id: null,
    valores: {
      nombre: 'Borrador',
      marca: '',
      descripcion: '',
      presentacion: '',
      precio_cop: null,
      activo: false,
      imagen_ruta: null,
    },
  };
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    servicio = TestBed.inject(ProductoBorradorService);
    await servicio.listo;
    await servicio.guardar(borrador);
  });

  it('conserva el formulario y la imagen anterior al cancelar', async () => {
    vi.mocked(Camera.takePhoto).mockRejectedValue({ code: 'OS-PLUG-CAMR-0006' });
    await servicio.seleccionar('camara');
    expect(servicio.borrador()).toEqual(borrador);
    expect(servicio.error()).toBe('');
  });

  it('explica cómo resolver permisos denegados', async () => {
    vi.mocked(Camera.chooseFromGallery).mockRejectedValue({ code: 'OS-PLUG-CAMR-0005' });
    await servicio.seleccionar('galeria');
    expect(servicio.error()).toContain('Ajustes');
    expect(servicio.borrador()?.valores.nombre).toBe('Borrador');
  });

  it('recupera el resultado de cámara sin subirlo ni perder los campos', async () => {
    const callback = vi.mocked(App.addListener).mock.calls[0][1] as unknown as (
      evento: RestoredListenerEvent,
    ) => Promise<void>;
    const foto = {
      type: MediaType.Photo,
      uri: 'file:///cache/perfume.jpg',
      webPath: 'https://localhost/_capacitor_file_/cache/perfume.jpg',
      saved: false,
    };
    await callback({ pluginId: 'Camera', methodName: 'takePhoto', success: true, data: foto });
    expect(servicio.borrador()).toEqual({ ...borrador, foto });
    expect(servicio.restaurado()).toBe(true);
    expect(Preferences.set).toHaveBeenLastCalledWith({
      key: 'producto-borrador-v1',
      value: JSON.stringify({ ...borrador, foto }),
    });
  });
});
