export interface Producto {
  id: string;
  nombre: string;
  marca: string;
  descripcion: string;
  presentacion: string;
  precio_cop: number | null;
  imagen_ruta: string | null;
  activo: boolean;
  origen_id: number | null;
  origen_precio: number | null;
}

export type ProductoEdicion = Pick<
  Producto,
  'nombre' | 'marca' | 'descripcion' | 'presentacion' | 'precio_cop' | 'imagen_ruta' | 'activo'
>;

export interface ConsultaProductos {
  pagina: number;
  busqueda?: string;
  orden?: 'nombre' | 'precio_asc' | 'precio_desc';
  estado?: 'activos' | 'inactivos' | 'todos';
}

export const TAMANO_PAGINA = 20;
