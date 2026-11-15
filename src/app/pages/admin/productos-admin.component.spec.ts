import { ToastController } from '@ionic/angular';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { Perfil } from '../../services/auth.service';
import { AuthService } from '../../services/auth.service';
import type { BorradorProducto } from '../../services/producto-borrador.service';
import { ProductoBorradorService } from '../../services/producto-borrador.service';
import { ProductoService } from '../../services/producto.service';

import { ProductosAdminComponent } from './productos-admin.component';

describe('ProductosAdminComponent', () => {
  const usuario = signal<Perfil | null>(null);
  const borrador = signal<BorradorProducto | null>(null);
  const guardar = vi.fn();
  const toast = vi.fn();

  beforeEach(() => {
    usuario.set({ id: 'admin', nombre: 'Admin', email: 'admin@example.test', rol: 'admin' });
    borrador.set(null);
    guardar.mockReset().mockResolvedValue(undefined);
    toast.mockReset().mockResolvedValue({ present: async () => undefined });
    TestBed.configureTestingModule({
      providers: [
        { provide: ToastController, useValue: { create: toast } },
        { provide: AuthService, useValue: { usuario, listo: Promise.resolve() } },
        {
          provide: ProductoService,
          useValue: { guardar, listar: vi.fn().mockResolvedValue({ productos: [], total: 0 }) },
        },
        {
          provide: ProductoBorradorService,
          useValue: {
            borrador,
            restaurado: signal(false),
            error: signal(''),
            listo: Promise.resolve(),
            guardar: async (valor: BorradorProducto | null) => {
              borrador.set(valor);
            },
          },
        },
      ],
    });
  });

  it('recupera el borrador del propietario y lo oculta al cambiar de cuenta', async () => {
    borrador.set({
      usuarioId: 'admin',
      id: null,
      valores: {
        nombre: 'Borrador propio',
        marca: '',
        descripcion: '',
        presentacion: '',
        precio_cop: null,
        activo: false,
        imagen_ruta: null,
      },
    });
    const fixture = TestBed.createComponent(ProductosAdminComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.nombre.value).toBe('Borrador propio');
    usuario.set(null);
    fixture.detectChanges();
    expect(fixture.componentInstance.editor()).toBe(false);
    expect(fixture.componentInstance.form.controls.nombre.value).toBe('');
    usuario.set({ id: 'otro', nombre: 'Otro', email: 'otro@example.test', rol: 'admin' });
    fixture.detectChanges();
    expect(fixture.componentInstance.editor()).toBe(false);
    await fixture.componentInstance.editar();
    expect(borrador()?.usuarioId).toBe('otro');
    expect(fixture.componentInstance.form.controls.nombre.value).toBe('');
  });

  it.each([
    ['nombre', 'Nombre'],
    ['marca', 'Marca'],
    ['descripcion', 'Descripción'],
    ['presentacion', 'Presentación'],
    ['precio_cop', 'Precio en COP'],
    ['imagen', 'imagen'],
  ])('impide guardar sin %s y muestra un toast', async (campo, etiqueta) => {
    const fixture = TestBed.createComponent(ProductosAdminComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.form.patchValue({
      nombre: 'Perfume',
      marca: 'Marca',
      descripcion: 'Descripción',
      presentacion: '100 ml',
      precio_cop: 50000,
    });
    component.imagenRuta = 'catalogo/foto.jpg';
    if (campo === 'imagen') component.imagenRuta = null;
    else if (campo === 'precio_cop') component.form.controls.precio_cop.setValue(null);
    else component.form.get(campo)?.setValue('   ');
    await component.guardar();
    expect(guardar).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining(etiqueta) }));
  });

  it('guarda un perfume completo sin mostrar validaciones', async () => {
    const fixture = TestBed.createComponent(ProductosAdminComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.form.patchValue({
      nombre: ' Perfume ',
      marca: 'Marca',
      descripcion: 'Descripción',
      presentacion: '100 ml',
      precio_cop: 50000,
    });
    component.imagenRuta = 'catalogo/foto.jpg';
    await component.guardar();
    expect(guardar).toHaveBeenCalledWith(null, expect.objectContaining({ nombre: 'Perfume' }), undefined);
    expect(toast).not.toHaveBeenCalled();
  });
});
