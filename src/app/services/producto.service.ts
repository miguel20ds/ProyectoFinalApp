import { Injectable, inject } from '@angular/core';

import type { ConsultaProductos, Producto, ProductoEdicion } from '../models/producto';
import { TAMANO_PAGINA } from '../models/producto';

import { SupabaseService } from './supabase.service';

export function validarImagen(blob: Blob): void {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) {
    throw new Error('Selecciona una imagen JPEG, PNG o WebP.');
  }
  if (!blob.size || blob.size > 5 * 1024 * 1024) throw new Error('La imagen debe ocupar entre 1 byte y 5 MB.');
}

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private sb = inject(SupabaseService).client;

  async listar(opciones: ConsultaProductos): Promise<{ productos: Producto[]; total: number }> {
    let query = this.sb.from('productos').select('*', { count: 'exact' });
    const estado = opciones.estado ?? 'activos';
    if (estado !== 'todos') query = query.eq('activo', estado === 'activos');
    const texto = (opciones.busqueda ?? '')
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .trim()
      .slice(0, 100);
    if (texto) query = query.or(`nombre.ilike.%${texto}%,marca.ilike.%${texto}%`);
    if (opciones.orden?.startsWith('precio')) {
      query = query.order('precio_cop', { ascending: opciones.orden === 'precio_asc', nullsFirst: false });
    } else query = query.order('nombre');
    const desde = Math.max(0, opciones.pagina) * TAMANO_PAGINA;
    const { data, count, error } = await query.order('id').range(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw error;
    return { productos: (data ?? []) as Producto[], total: count ?? 0 };
  }

  async guardar(id: string | null, producto: ProductoEdicion, imagen?: Blob): Promise<void> {
    let subida: string | null = null;
    try {
      if (imagen) {
        validarImagen(imagen);
        const extension = imagen.type === 'image/jpeg' ? 'jpg' : imagen.type.split('/')[1];
        subida = `catalogo/${crypto.randomUUID()}.${extension}`;
        const { error } = await this.sb.storage
          .from('productos')
          .upload(subida, imagen, { contentType: imagen.type, upsert: false });
        if (error) {
          subida = null;
          throw error;
        }
      }
      const valores = { ...producto, imagen_ruta: subida ?? producto.imagen_ruta };
      const query = id
        ? this.sb.from('productos').update(valores).eq('id', id)
        : this.sb.from('productos').insert(valores);
      const { data, error } = await query.select('id').single();
      if (error) throw error;
      if (!data) throw new Error('No se pudo guardar el perfume.');
    } catch (error) {
      if (subida) {
        const referencia = await this.sb.from('productos').select('id').eq('imagen_ruta', subida).limit(1);
        if (!referencia.error && referencia.data?.length === 0) {
          const { error: limpieza } = await this.sb.storage.from('productos').remove([subida]);
          if (limpieza) console.error('Imagen pendiente de limpieza:', subida, limpieza);
        } else console.error('Se conserva la imagen hasta verificar el guardado:', subida);
      }
      throw error;
    }
  }

  async eliminar(producto: Producto): Promise<void> {
    const { data, error } = await this.sb.from('productos').delete().eq('id', producto.id).select('id').single();
    if (error) throw error;
    if (!data) throw new Error('No se pudo eliminar el perfume.');
  }
  async activar(producto: Producto, activo: boolean): Promise<void> {
    const { error } = await this.sb.from('productos').update({ activo }).eq('id', producto.id).select('id').single();
    if (error) throw error;
  }
}
