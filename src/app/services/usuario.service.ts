import { Injectable, inject } from '@angular/core';

import type { Perfil } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private sb = inject(SupabaseService).client;

  async listar(): Promise<Perfil[]> {
    const { data, error } = await this.sb.from('profiles').select('*').order('nombre', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Perfil[];
  }

  async setBloqueado(usuarioId: string, bloqueado: boolean): Promise<void> {
    const { error } = await this.sb.from('profiles').update({ bloqueado }).eq('id', usuarioId);

    if (error) throw error;
  }

  async actualizarPerfil(usuarioId: string, cambios: Partial<Pick<Perfil, 'nombre' | 'rol'>>): Promise<void> {
    const { error } = await this.sb.from('profiles').update(cambios).eq('id', usuarioId);

    if (error) throw error;
  }
}
