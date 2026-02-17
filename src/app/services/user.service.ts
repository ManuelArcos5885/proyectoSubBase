import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { UserProfile } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private API = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  getMe() {
    return this.http.get<{ user: { id: string; email: string; role: string } }>(`${this.API}/users/me`, {
      headers: this.authHeaders()
    });
  }

  getUsers() {
    return this.http.get<{ users: UserProfile[] }>(`${this.API}/users`, {
      headers: this.authHeaders()
    });
  }

  getById(userId: string) {
    return this.http.get<{ user: UserProfile | null }>(`${this.API}/users/${userId}`, {
      headers: this.authHeaders()
    });
  }

  updateById(userId: string, user: UserProfile) {
    return this.http.put(`${this.API}/users/${userId}`, user, {
      headers: this.authHeaders()
    });
  }

  deleteById(userId: string) {
    return this.http.delete(`${this.API}/users/${userId}`, {
      headers: this.authHeaders()
    });
  }

  private authHeaders() {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}
