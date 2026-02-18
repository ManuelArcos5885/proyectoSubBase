import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  email = '';
  password = '';
  error = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  login() {
    this.error = '';

    if (!this.email || !this.password) {
      this.error = 'Email y contraseña obligatorios';
      return;
    }

    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.auth.saveToken(res.session.access_token);
        this.auth.saveEmail(this.email);
        this.auth.saveRole(res?.user?.role ?? res?.session?.user?.role ?? '');
        this.router.navigate(['/inicio']);
      },
      error: () => {
        this.error = 'Credenciales incorrectas';
        this.cdr.detectChanges();
      }
    });
  }
}
