import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonCard, IonCardContent, IonInput, IonInputPasswordToggle,
  IonButton, ToastController, IonHeader, IonToolbar, IonButtons, IonBackButton,
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

const noVacio = (c: AbstractControl): ValidationErrors | null =>
  (c.value ?? '').trim() ? null : { required: true };

const tieneMayuscula = (c: AbstractControl): ValidationErrors | null =>
  /[A-Z]/.test(c.value ?? '') ? null : { mayuscula: true };

const tieneEspecial = (c: AbstractControl): ValidationErrors | null =>
  /[!@#$%^&*(),.?":{}|<>]/.test(c.value ?? '') ? null : { especial: true };

const coinciden: ValidatorFn = (g) =>
  g.get('password')?.value === g.get('confirmar')?.value ? null : { noCoinciden: true };

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['../login/login.page.scss'],
  imports: [
    ReactiveFormsModule, IonContent, IonCard, IonCardContent, IonInput,
    IonInputPasswordToggle, IonButton, IonHeader, IonToolbar, IonButtons, IonBackButton,
  ],
})
export class RegistroPage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private auth = inject(AuthService);

  cargando = signal(false);

  form = this.fb.nonNullable.group(
    {
      nombre: ['', [noVacio]],
      email: ['', [noVacio, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]],
      password: ['', [noVacio, Validators.minLength(6), tieneMayuscula, tieneEspecial]],
      confirmar: ['', [noVacio]],
    },
    { validators: [coinciden] },
  );

  private mensajes: Record<string, Record<string, string>> = {
    nombre: { required: 'El nombre es obligatorio' },
    email: { required: 'El correo es obligatorio', pattern: 'Ingresar correo válido' },
    password: {
      required: 'La contraseña es obligatoria',
      minlength: 'Mínimo 6 caracteres',
      mayuscula: 'Debe contener al menos una mayúscula',
      especial: 'Debe contener un carácter especial (ej. un punto)',
    },
    confirmar: { required: 'Confirma tu contraseña' },
  };

  error(campo: 'nombre' | 'email' | 'password' | 'confirmar'): string {
    const errs = this.form.controls[campo].errors;
    if (errs) {
      const clave = Object.keys(this.mensajes[campo]).find((k) => errs[k]);
      if (clave) return this.mensajes[campo][clave];
    }
    if (campo === 'confirmar' && this.form.hasError('noCoinciden') && this.form.controls.confirmar.touched) {
      return 'Las contraseñas no coinciden';
    }
    return '';
  }

  async registrarse() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      const primero = this.error('nombre') || this.error('email') || this.error('password') || this.error('confirmar');
      await this.mostrarToast(primero);
      return;
    }

    const { nombre, email, password } = this.form.getRawValue();
    this.cargando.set(true);
    try {
      await this.auth.registrar(nombre.trim(), email.trim(), password);
      if (this.auth.usuario()) {
        await this.mostrarToast(`Bienvenido ${nombre.trim()}`);
        this.router.navigate(['/catalogo'], { replaceUrl: true });
      } else {
        // Si el proyecto exige confirmar el correo, aún no hay sesión
        await this.mostrarToast('Cuenta creada. Revisa tu correo para confirmarla');
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    } catch (e) {
      console.error(e);
      await this.mostrarToast('No se pudo crear la cuenta. ¿Ya estás registrado?');
    } finally {
      this.cargando.set(false);
    }
  }

  private async mostrarToast(message: string) {
    const toast = await this.toastCtrl.create({
      message, duration: 2500, position: 'bottom', cssClass: 'toast-aroma',
    });
    await toast.present();
  }
}