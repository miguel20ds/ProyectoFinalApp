import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Perfil {
  id: string;
  nombre: string;
  email: string;
  rol: 'cliente' | 'admin';
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
    this.usuario.set(data as Perfil | null);
  }

  async registrar(nombre: string, email: string, password: string) {
    const { error } = await this.sb.auth.signUp({ email, password, options: { data: { nombre } } });
    if (error) throw error;
    await this.cargarPerfil();
  }

  async login(email: string, password: string): Promise<Perfil | null> {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await this.cargarPerfil();
    return this.usuario();
  }

  async logout() {
    await this.sb.auth.signOut();
    this.usuario.set(null);
  }
}