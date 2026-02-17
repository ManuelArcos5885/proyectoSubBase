import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Tripulante } from '../models/tripulante';

@Injectable({
  providedIn: 'root'
})
export class TripulanteService {
  private API = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  getMe() {
    return this.http.get<Tripulante | any>(`${this.API}/tripulante/me`, {
      headers: this.authHeaders()
    });
  }

  getUserMe() {
    return this.http.get<any>(`${this.API}/users/me`, {
      headers: this.authHeaders()
    });
  }

  getTripulantes() {
    return this.http.get<{ tripulantes: TripulanteResumen[] }>(`${this.API}/tripulantes`, {
      headers: this.authHeaders()
    });
  }

  getById(userId: string) {
    return this.http.get<any>(`${this.API}/tripulante/${userId}`, {
      headers: this.authHeaders()
    });
  }

  getDocumentosByUserId(userId: string) {
    return this.http.get<{ documentos: any[] }>(`${this.API}/tripulante/${userId}/documentos`, {
      headers: this.authHeaders()
    });
  }

  updateMe(data: Tripulante) {
    return this.http.put(`${this.API}/tripulante/me`, data, {
      headers: this.authHeaders()
    });
  }

  updateById(userId: string, data: Tripulante) {
    return this.http.put(`${this.API}/tripulante/${userId}`, data, {
      headers: this.authHeaders()
    });
  }

  deleteById(userId: string) {
    return this.http.delete(`${this.API}/users/${userId}`, {
      headers: this.authHeaders()
    });
  }

  createDocumento(payload: { tipo: string; archivo_path: string; fecha_caducidad?: string }) {
    return this.http.post(`${this.API}/tripulante/documentos`, payload, {
      headers: this.authHeaders()
    });
  }

  createDocumentoByUserId(userId: string, payload: { tipo: string; archivo_path: string; fecha_caducidad?: string }) {
    return this.http.post(`${this.API}/tripulante/${userId}/documentos`, payload, {
      headers: this.authHeaders()
    });
  }

  removeDocumento(archivoPath: string) {
    const params = new HttpParams().set('archivo_path', archivoPath);
    return this.http.delete(`${this.API}/tripulante/documentos`, {
      headers: this.authHeaders(),
      params
    });
  }

  removeDocumentoByUserId(userId: string, archivoPath: string) {
    const params = new HttpParams().set('archivo_path', archivoPath);
    return this.http.delete(`${this.API}/tripulante/${userId}/documentos`, {
      headers: this.authHeaders(),
      params
    });
  }

  getDocumentos() {
    return this.http.get<{ documentos: any[] }>(`${this.API}/tripulante/documentos`, {
      headers: this.authHeaders()
    });
  }

  private authHeaders() {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}

export interface TripulanteResumen {
  user_id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  nacionalidad: string;
  puesto: string;
}
