import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.email = this.auth.getEmail();
    this.syncAdminFromLocalState();

    this.userService.getMe().subscribe({
      next: (res) => {
        const role = res?.user?.role ?? '';
        if (role) {
          this.auth.saveRole(role);
        }
        this.isAdmin = this.auth.isAdminRole(role || this.auth.getRoleFromToken());
        this.cdr.detectChanges();
      },
      error: () => {
        this.syncAdminFromLocalState();
        this.cdr.detectChanges();
      }
    });
  }

  private syncAdminFromLocalState() {
    const cachedRole = this.auth.getRole();
    const tokenRole = this.auth.getRoleFromToken();
    this.isAdmin = this.auth.isAdminRole(cachedRole || tokenRole);
  }

  goTripulante() {
    this.router.navigate(['/tripulante-detalle']);
  }

  logout() {
    this.auth.logout();
  }
}
