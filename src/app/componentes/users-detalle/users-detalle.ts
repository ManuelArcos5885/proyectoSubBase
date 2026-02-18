import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { UserService } from '../../services/user.service';
import { UserProfile } from '../../models/user';

@Component({
  selector: 'app-users-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './users-detalle.html',
  styleUrl: './users-detalle.css',
})
export class UsersDetalleComponent implements OnInit {
  userEmail = 'Usuario';
  user: UserProfile = this.emptyUser();
  mensaje = '';
  targetUserId = '';
  cargando = false;
  isAdmin = false;

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const paramId = this.route.snapshot.paramMap.get('id');
    const stateUser = this.router.getCurrentNavigation()?.extras.state?.['user'] ?? history.state?.user;
    this.targetUserId = paramId || stateUser?.id || '';

    this.userService.getMe().subscribe({
      next: (res) => {
        const role = (res?.user?.role ?? '').toUpperCase();
        this.isAdmin = role === 'ADMIN' || role === 'ADMINISTRADOR';
        if (!this.isAdmin) {
          this.router.navigate(['/tripulante-detalle']);
          return;
        }
        if (stateUser && !paramId) {
          this.user = {
            ...this.emptyUser(),
            ...stateUser
          };
          this.targetUserId = this.user.id;
          this.userEmail = this.user.email || 'Usuario';
          this.cdr.detectChanges();
          return;
        }
        if (this.targetUserId) {
          this.cargarUsuarioPorId(this.targetUserId);
        }
      },
      error: () => {
        this.showError('No se pudo validar el usuario.');
      }
    });
  }

  save() {
    this.mensaje = '';
    if (!this.targetUserId) {
      this.showError('No se pudo identificar el usuario.');
      return;
    }
    if (!this.user.email?.trim()) {
      this.showError('El email es obligatorio.');
      return;
    }
    if (!this.user.role?.trim()) {
      this.showError('El rol es obligatorio.');
      return;
    }

    this.userService.updateById(this.targetUserId, this.user).subscribe({
      next: () => {
        this.showSuccess('Datos guardados.');
      },
      error: () => {
        this.showError('No se pudieron guardar los datos.');
      }
    });
  }

  private emptyUser(): UserProfile {
    return {
      id: '',
      email: '',
      role: 'TRIPULANTE',
      nombre: '',
      apellidos: '',
      telefono: '',
      nacionalidad: '',
      puesto: ''
    };
  }

  private cargarUsuarioPorId(userId: string) {
    this.cargando = true;
    this.userService.getById(userId).subscribe({
      next: (data) => {
        const item = data?.user ?? {};
        this.user = {
          ...this.emptyUser(),
          ...item
        };
        this.userEmail = this.user.email || 'Usuario';
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.showError('No se pudo cargar el usuario.');
      }
    });
  }

  private showSuccess(text: string) {
    this.mensaje = text;
    this.cdr.detectChanges();
  }

  private showError(text: string) {
    this.mensaje = text;
    this.cdr.detectChanges();
  }
}

