import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Base } from '../models/base';

@Injectable({
  providedIn: 'root'
})
export class BaseService {
  private API = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  getUserMe() {
    return this.http.get<any>(`${this.API}/users/me`, {
      headers: this.authHeaders()
    });
  }

  getBases() {
    return this.http.get<{ bases: BaseResumen[] }>(`${this.API}/bases`, {
      headers: this.authHeaders()
    });
  }

  getById(idBase: string) {
    return this.http.get<any>(`${this.API}/base/${idBase}`, {
      headers: this.authHeaders()
    });
  }

  create(data: Base) {
    return this.http.post(`${this.API}/base`, data, {
      headers: this.authHeaders()
    });
  }

  updateById(idBase: string, data: Base) {
    return this.http.put(`${this.API}/base/${idBase}`, data, {
      headers: this.authHeaders()
    });
  }

  deleteById(idBase: string) {
    return this.http.delete(`${this.API}/base/${idBase}`, {
      headers: this.authHeaders()
    });
  }

  private authHeaders() {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}

export interface BaseResumen {
  idBase: string;
  nombre: string;
  comunidad: string;
  provincia: string;
  direccion: string;
  lat?: number | null;
  lng?: number | null;
}
