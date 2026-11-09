import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Perfil } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private sb = inject(SupabaseService).client;

  /**
   * Obtiene la lista de todos los perfiles de usuario.
   */
  async listar(): Promise<Perfil[]> {
    const { data, error } = await this.sb
      .from('profiles')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Perfil[];
  }

  /**
   * Bloquea o desbloquea una cuenta de usuario.
   */
  async setBloqueado(usuarioId: string, bloqueado: boolean): Promise<void> {
    const { error } = await this.sb
      .from('profiles')
      .update({ bloqueado })
      .eq('id', usuarioId);

    if (error) throw error;
  }

  /**
   * Actualiza datos generales del perfil (nombre, rol).
   */
  async actualizarPerfil(usuarioId: string, cambios: Partial<Pick<Perfil, 'nombre' | 'rol'>>): Promise<void> {
    const { error } = await this.sb
      .from('profiles')
      .update(cambios)
      .eq('id', usuarioId);

    if (error) throw error;
  }

  /**
   * Cambia la contraseña de un usuario mediante la función RPC segura en Supabase.
   */
  async cambiarPassword(usuarioId: string, nuevaPassword: string): Promise<void> {
    const { error } = await this.sb.rpc('admin_cambiar_password', {
      target_user_id: usuarioId,
      new_password: nuevaPassword,
    });

    if (error) throw error;
  }

  /**
   * Envía un correo electrónico oficial de restablecimiento de contraseña.
   */
  async enviarResetEmail(email: string): Promise<void> {
    const { error } = await this.sb.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }
}

