import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Campana } from '../models/campana';

@Injectable({
  providedIn: 'root'
})
export class CampanaService {
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

  getCampanas() {
    return this.http.get<{ campanas: CampanaResumen[] }>(`${this.API}/campanas`, {
      headers: this.authHeaders()
    });
  }

  getById(idCampana: string) {
    return this.http.get<any>(`${this.API}/campana/${idCampana}`, {
      headers: this.authHeaders()
    });
  }

  create(data: Campana) {
    return this.http.post(`${this.API}/campana`, data, {
      headers: this.authHeaders()
    });
  }

  updateById(idCampana: string, data: Campana) {
    return this.http.put(`${this.API}/campana/${idCampana}`, data, {
      headers: this.authHeaders()
    });
  }

  deleteById(idCampana: string) {
    return this.http.delete(`${this.API}/campana/${idCampana}`, {
      headers: this.authHeaders()
    });
  }

  private authHeaders() {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}

export interface CampanaResumen {
  idCampana: string;
  nombre: string;
}
