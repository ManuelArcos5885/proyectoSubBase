import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Barco } from '../models/barco';

@Injectable({
  providedIn: 'root'
})
export class BarcoService {
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

  getBarcos() {
    return this.http.get<{ barcos: BarcoResumen[] }>(`${this.API}/barcos`, {
      headers: this.authHeaders()
    });
  }

  getById(barcoId: string) {
    return this.http.get<any>(`${this.API}/barco/${barcoId}`, {
      headers: this.authHeaders()
    });
  }

  create(data: Barco) {
    return this.http.post(`${this.API}/barco`, data, {
      headers: this.authHeaders()
    });
  }

  updateById(barcoId: string, data: Barco) {
    return this.http.put(`${this.API}/barco/${barcoId}`, data, {
      headers: this.authHeaders()
    });
  }

  deleteById(barcoId: string) {
    return this.http.delete(`${this.API}/barco/${barcoId}`, {
      headers: this.authHeaders()
    });
  }

  getDocumentosByBarcoId(barcoId: string) {
    return this.http.get<{ documentos: any[] }>(`${this.API}/barco/${barcoId}/documentos`, {
      headers: this.authHeaders()
    });
  }

  getTripulantesByBarcoId(barcoId: string) {
    return this.http.get<{ tripulantes: any[] }>(`${this.API}/barco/${barcoId}/tripulantes`, {
      headers: this.authHeaders()
    });
  }

  addTripulanteToBarco(barcoId: string, payload: { idTripulante: string }) {
    return this.http.post(`${this.API}/barco/${barcoId}/tripulantes`, payload, {
      headers: this.authHeaders()
    });
  }

  removeTripulanteFromBarco(barcoId: string, idTripulante: string) {
    return this.http.delete(`${this.API}/barco/${barcoId}/tripulantes/${idTripulante}`, {
      headers: this.authHeaders()
    });
  }

  createDocumento(barcoId: string, payload: { tipo: string; archivo_path: string; fecha_caducidad?: string }) {
    return this.http.post(`${this.API}/barco/${barcoId}/documentos`, payload, {
      headers: this.authHeaders()
    });
  }

  removeDocumento(barcoId: string, archivoPath: string) {
    const params = new HttpParams().set('archivo_path', archivoPath);
    return this.http.delete(`${this.API}/barco/${barcoId}/documentos`, {
      headers: this.authHeaders(),
      params
    });
  }

  private authHeaders() {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}

export interface BarcoResumen {
  idBarco: string;
  nombre: string;
  fecha: string;
  tripulantesCount: number;
}

