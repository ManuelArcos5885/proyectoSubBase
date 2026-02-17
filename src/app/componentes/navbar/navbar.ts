import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit {
  email = '';
  isAdmin = false;

  constructor(
    private auth: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    this.email = this.auth.getEmail();
    this.userService.getMe().subscribe({
      next: (res) => {
        const role = (res?.user?.role ?? '').toUpperCase();
        this.isAdmin = role === 'ADMIN' || role === 'ADMINISTRADOR';
      },
      error: () => {
        this.isAdmin = false;
      }
    });
  }

  goTripulante() {
    this.router.navigate(['/tripulante-detalle']);
  }

  logout() {
    this.auth.logout();
  }
}
