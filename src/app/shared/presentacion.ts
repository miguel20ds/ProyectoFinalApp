import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

import { environment } from '../../environments/environment';

export function imagenProducto(ruta: string | null): string {
  if (!ruta) return '';
  if (/^https:\/\//i.test(ruta)) return ruta;
  return `${environment.supabaseUrl}/storage/v1/object/public/productos/${ruta}`;
}

export function precioReserva(precio: number, moneda: string | null): string {
  if (moneda === 'COP')
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(precio) + ' COP';
  return `${precio} (precio histórico, moneda no registrada)`;
}

@Pipe({ name: 'imagenProducto' })
export class ImagenProductoPipe implements PipeTransform {
  transform(ruta: string | null): string {
    return imagenProducto(ruta);
  }
}

@Pipe({ name: 'precioReserva' })
export class PrecioReservaPipe implements PipeTransform {
  transform(precio: number, moneda: string | null): string {
    return precioReserva(precio, moneda);
  }
}
