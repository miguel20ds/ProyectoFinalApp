import { Injectable, inject } from '@angular/core';

import type { Producto } from '../models/producto';

import { SupabaseService } from './supabase.service';

export interface Reserva {
  id: string;
  usuario_id: string;
  producto_id: number | null;
  perfume_id: string | null;
  moneda: 'COP' | null;
  producto_titulo: string;
  producto_imagen: string | null;
  precio: number;
  estado: 'pendiente' | 'entregado' | 'cancelada';
  creada_en: string;
  profiles?: { nombre: string; email: string } | null;
}

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private sb = inject(SupabaseService).client;

  async reservar(p: Producto): Promise<void> {
    const { error } = await this.sb.rpc('crear_reserva', { perfume_id: p.id });
    if (error) throw error;
  }

  async misReservas(usuarioId: string): Promise<Reserva[]> {
    const { data, error } = await this.sb
      .from('reservas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('creada_en', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Reserva[];
  }

  async cancelar(id: string): Promise<void> {
    const { error } = await this.sb.rpc('cancelar_reserva', { reserva_id: id });
    if (error) throw error;
  }

  async todas(): Promise<Reserva[]> {
    const { data, error } = await this.sb
      .from('reservas')
      .select('*, profiles(nombre, email)')
      .order('creada_en', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Reserva[];
  }

  async cambiarEstado(id: string, nuevoEstado: Reserva['estado']): Promise<void> {
    const { error } = await this.sb.rpc('cambiar_estado_reserva', { reserva_id: id, nuevo_estado: nuevoEstado });
    if (error) throw error;
  }
}

export const ETIQUETA_ESTADO: Record<Reserva['estado'], string> = {
  pendiente: 'Pendiente',
  entregado: 'Entregado',
  cancelada: 'Cancelada',
};
