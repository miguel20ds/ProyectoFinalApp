import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { ProductoEdicion } from '../models/producto';

import { ProductoService, validarImagen } from './producto.service';
import { SupabaseService } from './supabase.service';

describe('ProductoService', () => {
  const producto: ProductoEdicion = {
    nombre: 'Perfume',
    marca: '',
    descripcion: '',
    presentacion: '',
    precio_cop: 150000,
    activo: true,
    imagen_ruta: 'catalogo/anterior.jpg',
  };
  let servicio: ProductoService;
  let query: Record<string, ReturnType<typeof vi.fn>>;
  let upload: ReturnType<typeof vi.fn>;
  let remove: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    query = {};
    for (const metodo of ['select', 'eq', 'or', 'order', 'insert', 'update']) query[metodo] = vi.fn(() => query);
    query['range'] = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    query['single'] = vi.fn().mockResolvedValue({ data: { id: 'nuevo' }, error: null });
    query['limit'] = vi.fn().mockResolvedValue({ data: [], error: null });
    upload = vi.fn().mockResolvedValue({ error: null });
    remove = vi.fn().mockResolvedValue({ error: null });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SupabaseService,
          useValue: { client: { from: () => query, storage: { from: () => ({ upload, remove }) } } },
        },
      ],
    });
    servicio = TestBed.inject(ProductoService);
  });

  it('consulta solo activos, busca sin inyectar filtros y pagina de 20 en 20', async () => {
    await servicio.listar({ pagina: 1, busqueda: 'Dior,activo.eq.false', orden: 'precio_desc' });
    expect(query['eq']).toHaveBeenCalledWith('activo', true);
    expect(query['or']).toHaveBeenCalledWith('nombre.ilike.%Dior activo eq false%,marca.ilike.%Dior activo eq false%');
    expect(query['range']).toHaveBeenCalledWith(20, 39);
    expect(query['order']).toHaveBeenCalledWith('precio_cop', { ascending: false, nullsFirst: false });
  });

  it('rechaza archivos inválidos antes de subirlos', () => {
    expect(() => validarImagen(new Blob(['x'], { type: 'image/gif' }))).toThrow(/JPEG/);
    expect(() => validarImagen(new Blob([new Uint8Array(5242881)], { type: 'image/jpeg' }))).toThrow(/5 MB/);
    expect(() => validarImagen(new Blob([], { type: 'image/png' }))).toThrow();
  });

  it('retira solamente la nueva subida si falla el registro', async () => {
    query['single'].mockResolvedValue({ error: new Error('Sin permisos') });
    await expect(servicio.guardar('existente', producto, new Blob(['x'], { type: 'image/png' }))).rejects.toThrow(
      'Sin permisos',
    );
    const ruta = upload.mock.calls[0][0] as string;
    expect(ruta).toMatch(/^catalogo\/.*\.png$/);
    expect(remove).toHaveBeenCalledWith([ruta]);
    expect(remove).not.toHaveBeenCalledWith(['catalogo/anterior.jpg']);
  });

  it('conserva las imágenes históricas después de guardar una sustitución', async () => {
    await servicio.guardar('existente', producto, new Blob(['x'], { type: 'image/jpeg' }));
    expect(remove).not.toHaveBeenCalled();
    expect(query['update']).toHaveBeenCalledWith(
      expect.objectContaining({ imagen_ruta: expect.stringMatching(/\.jpg$/) }),
    );
  });

  it('no elimina una imagen si se perdió la respuesta de un guardado exitoso', async () => {
    query['single'].mockResolvedValue({ error: new Error('Respuesta perdida') });
    query['limit'].mockResolvedValue({ data: [{ id: 'guardado' }], error: null });
    await expect(servicio.guardar(null, producto, new Blob(['x'], { type: 'image/png' }))).rejects.toThrow();
    expect(remove).not.toHaveBeenCalled();
  });

  it('no intenta guardar el registro cuando falla la subida', async () => {
    upload.mockResolvedValue({ error: new Error('Sin conexión') });
    await expect(servicio.guardar(null, producto, new Blob(['x'], { type: 'image/png' }))).rejects.toThrow(
      'Sin conexión',
    );
    expect(query['insert']).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
