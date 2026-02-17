import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Puerto } from '../models/puerto';

@Injectable({
  providedIn: 'root'
})
export class PuertoService {
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

  getPuertos() {
    return this.http.get<{ puertos: PuertoResumen[] }>(`${this.API}/puertos`, {
      headers: this.authHeaders()
    });
  }

  getById(idPuerto: string) {
    return this.http.get<any>(`${this.API}/puerto/${idPuerto}`, {
      headers: this.authHeaders()
    });
  }

  create(data: Puerto) {
    return this.http.post(`${this.API}/puerto`, data, {
      headers: this.authHeaders()
    });
  }

  updateById(idPuerto: string, data: Puerto) {
    return this.http.put(`${this.API}/puerto/${idPuerto}`, data, {
      headers: this.authHeaders()
    });
  }

  deleteById(idPuerto: string) {
    return this.http.delete(`${this.API}/puerto/${idPuerto}`, {
      headers: this.authHeaders()
    });
  }

  getBarcosByPuertoId(idPuerto: string) {
    return this.http.get<{ barcos: any[] }>(`${this.API}/puerto/${idPuerto}/barcos`, {
      headers: this.authHeaders()
    });
  }

  addBarcoToPuerto(idPuerto: string, payload: { idBarco: string }) {
    return this.http.post(`${this.API}/puerto/${idPuerto}/barcos`, payload, {
      headers: this.authHeaders()
    });
  }

  removeBarcoFromPuerto(idPuerto: string, idBarco: string) {
    return this.http.delete(`${this.API}/puerto/${idPuerto}/barcos/${idBarco}`, {
      headers: this.authHeaders()
    });
  }

  private authHeaders() {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}

export interface PuertoResumen {
  idPuerto: string;
  nombre: string;
  comunidad: string;
  provincia: string;
  direccion: string;
  lat?: number | null;
  lng?: number | null;
  totalBarcos?: number;
}
