import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private API = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(email: string, password: string) {
    return this.http.post<any>(`${this.API}/auth/login`, {
      email,
      password
    });
  }

  register(email: string, password: string) {
    return this.http.post<any>(`${this.API}/auth/register`, {
      email,
      password
    });
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  saveEmail(email: string) {
    localStorage.setItem('email', email);
  }

  saveRole(role: string) {
    localStorage.setItem('role', role);
  }

  getEmail(): string {
    return localStorage.getItem('email') ?? '';
  }

  getRole(): string {
    return localStorage.getItem('role') ?? '';
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRoleFromToken(): string | null {
    const decoded = this.decodeTokenPayload();
    return decoded?.role || decoded?.user_role || decoded?.rol || decoded?.app_metadata?.role || null;
  }

  isAdminRole(role: string | null | undefined): boolean {
    const normalized = String(role ?? '').trim().toUpperCase();
    return normalized === 'ADMIN' || normalized === 'ADMINISTRADOR';
  }

  getUserIdFromToken(): string | null {
    const decoded = this.decodeTokenPayload();
    return decoded?.sub || decoded?.user_id || decoded?.userId || null;
  }

  private decodeTokenPayload(): any | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = token.split('.')[1];
      if (!payload) {
        return null;
      }

      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const decodedJson = atob(padded);
      return JSON.parse(decodedJson);
    } catch {
      return null;
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    this.router.navigate(['/login']);
  }
}
