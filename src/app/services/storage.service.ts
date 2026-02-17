import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private supabaseUrl = 'https://mmebeofwcinmiecthtes.supabase.co';
  private supabaseAnonKey = 'sb_publishable_D_mezCtQsvcnoL1-9SBq1g_DmdKM8k0';
  private bucket = 'certificados';

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  uploadPdf(file: File, path: string) {
    const url = `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${this.encodePath(
      path
    )}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/pdf',
      Authorization: `Bearer ${this.authTokenOrAnon()}`,
      apikey: this.supabaseAnonKey,
      'x-upsert': 'true'
    });

    return this.http.put(url, file, { headers });
  }

  uploadPdfToBucket(file: File, path: string, bucket: string) {
    const url = `${this.supabaseUrl}/storage/v1/object/${bucket}/${this.encodePath(path)}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/pdf',
      Authorization: `Bearer ${this.authTokenOrAnon()}`,
      apikey: this.supabaseAnonKey,
      'x-upsert': 'true'
    });

    return this.http.put(url, file, { headers });
  }

  downloadPdf(path: string) {
    const url = `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${this.encodePath(
      path
    )}`;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authTokenOrAnon()}`,
      apikey: this.supabaseAnonKey
    });

    return this.http.get(url, {
      headers,
      responseType: 'blob'
    });
  }

  downloadPdfFromBucket(path: string, bucket: string) {
    const url = `${this.supabaseUrl}/storage/v1/object/${bucket}/${this.encodePath(path)}`;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authTokenOrAnon()}`,
      apikey: this.supabaseAnonKey
    });

    return this.http.get(url, {
      headers,
      responseType: 'blob'
    });
  }

  private encodePath(path: string) {
    return path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  }

  private authTokenOrAnon() {
    return this.auth.getToken() || this.supabaseAnonKey;
  }
}
