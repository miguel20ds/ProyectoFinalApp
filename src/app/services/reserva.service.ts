import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Producto } from '../models/producto';

export interface Reserva {
  id: string;
  usuario_id: string;
  producto_id: number;
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
    const { error } = await this.sb.from('reservas').insert({
      producto_id: p.id,
      producto_titulo: p.title,
      producto_imagen: p.thumbnail,
      precio: p.price,
    });
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
    const { data, error } = await this.sb
      .from('reservas').update({ estado: 'cancelada' }).eq('id', id).select();
    if (error) throw error;
    if (!data?.length) throw new Error('No se pudo cancelar');
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
    const { data, error } = await this.sb
      .from('reservas')
      .update({ estado: nuevoEstado })
      .eq('id', id)
      .select();
    if (error) throw error;
    if (!data?.length) throw new Error('No se pudo actualizar el estado de la reserva');
  }

  async marcarEntregado(id: string): Promise<void> {
    return this.cambiarEstado(id, 'entregado');
  }
}

export const ETIQUETA_ESTADO: Record<Reserva['estado'], string> = {
  pendiente: 'Pendiente',
  entregado: 'Entregado',
  cancelada: 'Cancelada',
};