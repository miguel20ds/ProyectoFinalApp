import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductResponse } from '../models/producto';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'https://dummyjson.com';

  getFragancias(): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.baseUrl}/products/category/fragrances`);
  }
}