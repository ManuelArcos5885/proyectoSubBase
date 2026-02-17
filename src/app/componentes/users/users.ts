import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { UserService } from '../../services/user.service';
import { UserProfile } from '../../models/user';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class UsersComponent implements OnInit {
  users: UserProfile[] = [];
  cargando = false;
  mensaje = '';
  error = '';

  constructor(
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargando = true;
    this.userService.getMe().subscribe({
      next: (res) => {
        const role = (res?.user?.role ?? '').toUpperCase();
        if (role !== 'ADMIN' && role !== 'ADMINISTRADOR') {
          this.router.navigate(['/tripulante-detalle']);
          return;
        }

        this.userService.getUsers().subscribe({
          next: (data) => {
            this.users = data?.users ?? [];
            this.cargando = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.error = 'No se pudo cargar el listado de usuarios.';
            this.cargando = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.error = 'No se pudo validar el usuario.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  goDetalle(user: UserProfile) {
    this.router.navigate(['/users-detalle', user.id], {
      state: { user }
    });
  }

  eliminarUser(item: UserProfile, event: Event) {
    event.stopPropagation();
    this.mensaje = '';
    this.error = '';

    const label = item.email || item.id;
    if (!confirm(`Eliminar el usuario "${label}"?`)) {
      return;
    }

    this.userService.deleteById(item.id).subscribe({
      next: () => {
        this.users = this.users.filter((u) => u.id !== item.id);
        this.mensaje = 'Usuario eliminado correctamente.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        const backendMessage = err?.error?.error ? String(err.error.error) : '';
        this.error = backendMessage || 'No se pudo eliminar el usuario.';
        this.cdr.detectChanges();
      }
    });
  }
}
