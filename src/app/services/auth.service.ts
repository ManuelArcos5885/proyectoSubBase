import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private API = 'http://localhost:3000';

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

  getEmail(): string {
    return localStorage.getItem('email') ?? '';
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserIdFromToken(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = token.split('.')[1];
      if (!payload) {
        return null;
      }

      const decoded = JSON.parse(atob(payload));
      return decoded.sub || decoded.user_id || decoded.userId || null;
    } catch {
      return null;
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    this.router.navigate(['/login']);
  }
}
