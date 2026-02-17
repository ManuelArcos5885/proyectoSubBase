import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { BaseService, BaseResumen } from '../../services/base.service';

@Component({
  selector: 'app-base',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './base.html',
  styleUrl: './base.css',
})
export class BaseComponent implements OnInit {
  bases: BaseResumen[] = [];
  cargando = false;
  mensaje = '';
  error = '';

  constructor(
    private baseService: BaseService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargando = true;
    this.baseService.getUserMe().subscribe({
      next: (res) => {
        const role = (res?.user?.role ?? '').toUpperCase();
        if (role !== 'ADMIN' && role !== 'ADMINISTRADOR') {
          this.error = 'No autorizado.';
          this.cargando = false;
          this.cdr.detectChanges();
          return;
        }

        this.baseService.getBases().subscribe({
          next: (data) => {
            this.bases = data?.bases ?? [];
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

  goDetalle(item: BaseResumen) {
    this.router.navigate(['/base-detalle', item.idBase], {
      state: { base: item }
    });
  }

  nuevaBase() {
    this.router.navigate(['/base-detalle']);
  }

  eliminarBase(item: BaseResumen, event: Event) {
    event.stopPropagation();
    this.mensaje = '';
    this.error = '';
    if (!confirm(`Eliminar la base "${item.nombre}"?`)) {
      return;
    }

    this.baseService.deleteById(item.idBase).subscribe({
      next: () => {
        this.bases = this.bases.filter((base) => base.idBase !== item.idBase);
        this.mensaje = 'Base eliminada correctamente.';
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensaje = '';
        this.error = 'No se pudo eliminar la base.';
        this.cdr.detectChanges();
      }
    });
  }
}
