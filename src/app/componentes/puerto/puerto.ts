import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { PuertoService, PuertoResumen } from '../../services/puerto.service';

@Component({
  selector: 'app-puerto',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './puerto.html',
  styleUrl: './puerto.css',
})
export class PuertoComponent implements OnInit {
  puertos: PuertoResumen[] = [];
  cargando = false;
  mensaje = '';
  error = '';

  constructor(
    private puertoService: PuertoService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargando = true;
    this.puertoService.getUserMe().subscribe({
      next: (res) => {
        const role = (res?.user?.role ?? '').toUpperCase();
        if (role !== 'ADMIN' && role !== 'ADMINISTRADOR') {
          this.error = 'No autorizado.';
          this.cargando = false;
          this.cdr.detectChanges();
          return;
        }

        this.puertoService.getPuertos().subscribe({
          next: (data) => {
            this.puertos = data?.puertos ?? [];
            this.cargando = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.error = 'No se pudo cargar el listado.';
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

  goDetalle(item: PuertoResumen) {
    this.router.navigate(['/puerto-detalle', item.idPuerto], {
      state: { puerto: item }
    });
  }

  nuevoPuerto() {
    this.router.navigate(['/puerto-detalle']);
  }

  eliminarPuerto(item: PuertoResumen, event: Event) {
    event.stopPropagation();
    this.mensaje = '';
    this.error = '';
    if (!confirm(`Eliminar el puerto "${item.nombre}"?`)) {
      return;
    }

    this.puertoService.deleteById(item.idPuerto).subscribe({
      next: () => {
        this.puertos = this.puertos.filter((puerto) => puerto.idPuerto !== item.idPuerto);
        this.mensaje = 'Puerto eliminado correctamente.';
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensaje = '';
        this.error = 'No se pudo eliminar el puerto.';
        this.cdr.detectChanges();
      }
    });
  }
}
