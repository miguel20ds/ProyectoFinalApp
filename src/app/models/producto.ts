export interface Producto {
  id: number;
  title: string;
  description: string;
  price: number;
  rating: number;
  brand?: string;
  thumbnail: string;
}

export interface ProductResponse {
  products: Producto[];
}