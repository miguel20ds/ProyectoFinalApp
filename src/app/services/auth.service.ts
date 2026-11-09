import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Perfil {
  id: string;
  nombre: string;
  email: string;
  rol: 'cliente' | 'admin';
  bloqueado?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private sb = inject(SupabaseService).client;

  usuario = signal<Perfil | null>(null);
  listo: Promise<void> = this.cargarPerfil(); 

  private async cargarPerfil(): Promise<void> {
    const { data: { session } } = await this.sb.auth.getSession();
    if (!session) { this.usuario.set(null); return; }
    const { data } = await this.sb.from('profiles').select('*').eq('id', session.user.id).single();
    const perfil = data as Perfil | null;

    if (perfil?.bloqueado) {
      await this.sb.auth.signOut();
      this.usuario.set(null);
      return;
    }

    this.usuario.set(perfil);
  }

  async registrar(nombre: string, email: string, password: string) {
    const { error } = await this.sb.auth.signUp({ email, password, options: { data: { nombre } } });
    if (error) throw error;
    await this.cargarPerfil();
  }

  async login(email: string, password: string): Promise<Perfil | null> {
    const { data: authData, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: perfilData, error: perfilError } = await this.sb
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (perfilError || !perfilData) {
      await this.sb.auth.signOut();
      throw new Error('PERFIL_NO_ENCONTRADO');
    }

    const perfil = perfilData as Perfil;
    if (perfil.bloqueado) {
      await this.sb.auth.signOut();
      this.usuario.set(null);
      const err = new Error('CUENTA_BLOQUEADA');
      (err as any).code = 'CUENTA_BLOQUEADA';
      throw err;
    }

    this.usuario.set(perfil);
    return perfil;
  }

  async logout() {
    await this.sb.auth.signOut();
    this.usuario.set(null);
  }
}