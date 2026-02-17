import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {

  email = '';
  password = '';
  repeatPassword = '';
  error = '';
  success = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  register() {
    this.error = '';
    this.success = '';

    if (!this.email || !this.password || !this.repeatPassword) {
      this.error = 'Todos los campos son obligatorios';
      return;
    }

    if (this.password !== this.repeatPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.auth.register(this.email, this.password).subscribe({
      next: () => {
        this.success = 'Usuario creado. Ya puedes iniciar sesión';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al registrar';
      }
    });
  }
}
