import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { Producto } from '../models/producto';

import { ReservaService } from './reserva.service';
import { SupabaseService } from './supabase.service';

describe('ReservaService RPC', () => {
  const rpc = vi.fn();
  let servicio: ReservaService;
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ error: null });
    TestBed.configureTestingModule({ providers: [{ provide: SupabaseService, useValue: { client: { rpc } } }] });
    servicio = TestBed.inject(ReservaService);
  });
  it('envía solo el identificador del perfume, sin confiar en su precio local', async () => {
    await servicio.reservar({ id: 'perfume', precio_cop: 1, nombre: 'Manipulado' } as Producto);
    expect(rpc).toHaveBeenCalledWith('crear_reserva', { perfume_id: 'perfume' });
  });
  it('cancela y cambia estados mediante operaciones restringidas', async () => {
    await servicio.cancelar('reserva');
    await servicio.cambiarEstado('reserva', 'entregado');
    expect(rpc).toHaveBeenCalledWith('cancelar_reserva', { reserva_id: 'reserva' });
    expect(rpc).toHaveBeenCalledWith('cambiar_estado_reserva', { reserva_id: 'reserva', nuevo_estado: 'entregado' });
  });
  it('propaga errores de permisos y duplicados', async () => {
    const error = { code: '23505' };
    rpc.mockResolvedValue({ error });
    await expect(servicio.reservar({ id: 'p' } as Producto)).rejects.toEqual(error);
  });
});
