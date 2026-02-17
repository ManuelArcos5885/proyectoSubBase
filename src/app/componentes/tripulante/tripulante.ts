import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TripulanteService, TripulanteResumen } from '../../services/tripulante.service';
import { NavbarComponent } from '../navbar/navbar';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { Tripulante } from '../../models/tripulante';

@Component({
  selector: 'app-tripulante',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent],
  templateUrl: './tripulante.html',
  styleUrl: './tripulante.css',
})
export class TripulanteComponent implements OnInit {
  tripulantes: TripulanteResumen[] = [];
  cargando = false;
  mensaje = '';
  error = '';
  creandoUsuario = false;
  guardandoTripulante = false;
  nuevoUsuarioId = '';
  nuevoUsuarioEmail = '';
  cuentaForm = {
    email: '',
    password: '',
    repeatPassword: ''
  };
  tripulanteForm: Tripulante = this.emptyTripulante();

  constructor(
    private tripulanteService: TripulanteService,
    private auth: AuthService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargando = true;
    this.tripulanteService.getUserMe().subscribe({
      next: (res) => {
        const role = (res?.user?.role ?? '').toUpperCase();
        if (role !== 'ADMIN' && role !== 'ADMINISTRADOR') {
          this.router.navigate(['/tripulante-detalle']);
          return;
        }

        this.cargarTripulantes();
      },
      error: () => {
        this.error = 'No se pudo validar el usuario.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  crearUsuarioBase() {
    this.mensaje = '';
    this.error = '';

    const email = this.cuentaForm.email.trim().toLowerCase();
    const password = this.cuentaForm.password;
    const repeatPassword = this.cuentaForm.repeatPassword;

    if (!email || !password || !repeatPassword) {
      this.error = 'Completa email y contrasena para crear el usuario.';
      return;
    }
    if (password !== repeatPassword) {
      this.error = 'Las contrasenas no coinciden.';
      return;
    }

    this.creandoUsuario = true;
    this.auth.register(email, password).subscribe({
      next: () => {
        this.resolverUsuarioPorEmail(email);
      },
      error: (err) => {
        const backendMessage = err?.error?.error ? String(err.error.error) : '';
        this.error = backendMessage || 'No se pudo crear el usuario.';
        this.creandoUsuario = false;
        this.cdr.detectChanges();
      }
    });
  }

  guardarDatosTripulanteNuevo() {
    this.mensaje = '';
    this.error = '';

    if (!this.nuevoUsuarioId || !this.nuevoUsuarioEmail) {
      this.error = 'Primero crea el usuario.';
      return;
    }

    if (!this.tripulanteForm.nombre.trim() || !this.tripulanteForm.apellidos.trim()) {
      this.error = 'Nombre y apellidos son obligatorios para la ficha.';
      return;
    }

    const userPayload = {
      id: this.nuevoUsuarioId,
      email: this.nuevoUsuarioEmail,
      role: 'TRIPULANTE',
      nombre: this.tripulanteForm.nombre,
      apellidos: this.tripulanteForm.apellidos,
      telefono: this.tripulanteForm.telefono,
      nacionalidad: this.tripulanteForm.nacionalidad,
      puesto: this.tripulanteForm.puesto
    };

    this.guardandoTripulante = true;
    this.userService.updateById(this.nuevoUsuarioId, userPayload).subscribe({
      next: () => {
        this.tripulanteService.updateById(this.nuevoUsuarioId, this.tripulanteForm).subscribe({
          next: () => {
            this.mensaje = 'Usuario y ficha de tripulante guardados.';
            this.guardandoTripulante = false;
            this.cargarTripulantes();
            this.resetCrearTripulanteForm();
            this.cdr.detectChanges();
          },
          error: (err) => {
            const backendMessage = err?.error?.error ? String(err.error.error) : '';
            this.error = backendMessage || 'No se pudo guardar la ficha de tripulante.';
            this.guardandoTripulante = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        const backendMessage = err?.error?.error ? String(err.error.error) : '';
        this.error = backendMessage || 'No se pudo actualizar el usuario.';
        this.guardandoTripulante = false;
        this.cdr.detectChanges();
      }
    });
  }

  goDetalle(item: TripulanteResumen) {
    this.router.navigate(['/tripulante-detalle', item.user_id], {
      state: { tripulante: item }
    });
  }

  eliminarTripulante(item: TripulanteResumen, event: Event) {
    event.stopPropagation();
    this.mensaje = '';
    this.error = '';

    const nombre = `${item.nombre ?? ''} ${item.apellidos ?? ''}`.trim() || item.user_id;
    if (!confirm(`Eliminar el tripulante "${nombre}"?`)) {
      return;
    }

    this.tripulanteService.deleteById(item.user_id).subscribe({
      next: () => {
        this.tripulantes = this.tripulantes.filter((t) => t.user_id !== item.user_id);
        this.mensaje = 'Tripulante eliminado correctamente.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        const backendMessage = err?.error?.error ? String(err.error.error) : '';
        this.error = backendMessage || 'No se pudo eliminar el tripulante.';
        this.cdr.detectChanges();
      }
    });
  }

  private cargarTripulantes() {
    this.cargando = true;
    this.tripulanteService.getTripulantes().subscribe({
      next: (data) => {
        this.tripulantes = data?.tripulantes ?? [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudo cargar el listado.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private resolverUsuarioPorEmail(email: string) {
    this.userService.getUsers().subscribe({
      next: (data) => {
        const users = data?.users ?? [];
        const match = users.find((u) => (u.email ?? '').toLowerCase() === email);
        if (!match?.id) {
          this.error = 'Usuario creado, pero no se pudo resolver su ID.';
          this.creandoUsuario = false;
          this.cdr.detectChanges();
          return;
        }

        this.nuevoUsuarioId = match.id;
        this.nuevoUsuarioEmail = match.email;
        this.mensaje = 'Usuario base creado. Ahora completa la ficha de tripulante.';
        this.creandoUsuario = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Usuario creado, pero no se pudo consultar el listado.';
        this.creandoUsuario = false;
        this.cdr.detectChanges();
      }
    });
  }

  private resetCrearTripulanteForm() {
    this.cuentaForm = {
      email: '',
      password: '',
      repeatPassword: ''
    };
    this.tripulanteForm = this.emptyTripulante();
    this.nuevoUsuarioId = '';
    this.nuevoUsuarioEmail = '';
    this.creandoUsuario = false;
    this.guardandoTripulante = false;
  }

  private emptyTripulante(): Tripulante {
    return {
      nombre: '',
      apellidos: '',
      telefono: '',
      nacionalidad: '',
      puesto: ''
    };
  }
}
