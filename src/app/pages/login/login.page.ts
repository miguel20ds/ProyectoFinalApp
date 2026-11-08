import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonCard, IonCardContent, IonInput, IonInputPasswordToggle,
  IonButton, ToastController, IonHeader, IonToolbar, IonButtons, IonBackButton,
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    ReactiveFormsModule, IonContent, IonCard, IonCardContent, IonInput,
    IonInputPasswordToggle, IonButton, IonHeader, IonToolbar, IonButtons, IonBackButton,
  ],
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private auth = inject(AuthService);

  cargando = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]],
    password: ['', [Validators.required]],
  });

  private mensajes: Record<string, Record<string, string>> = {
    email: { required: 'El correo es obligatorio', pattern: 'Ingresar correo válido' },
    password: { required: 'La contraseña es obligatoria' },
  };

  error(campo: 'email' | 'password'): string {
    const errs = this.form.controls[campo].errors;
    if (!errs) return '';
    const clave = Object.keys(this.mensajes[campo]).find((k) => errs[k]);
    return clave ? this.mensajes[campo][clave] : '';
  }

  async iniciarSesion() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      await this.mostrarToast(this.error('email') || this.error('password'));
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.cargando.set(true);
    try {
      const perfil = await this.auth.login(email, password);
      if (!perfil) {
        await this.mostrarToast('No se encontró tu perfil, contacta al administrador');
        return;
      }
      await this.mostrarToast(`Bienvenido ${perfil.nombre}`);
      this.router.navigate([perfil.rol === 'admin' ? '/admin' : '/catalogo'], { replaceUrl: true });
    } catch {
      await this.mostrarToast('Correo o contraseña incorrectos');
    } finally {
      this.cargando.set(false);
    }
  }

  irARegistro() {
    this.router.navigate(['/registro']);
  }

  private async mostrarToast(message: string) {
    const toast = await this.toastCtrl.create({
      message, duration: 2000, position: 'bottom', cssClass: 'toast-aroma',
    });
    await toast.present();
  }
}