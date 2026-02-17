import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { BarcoService, BarcoResumen } from '../../services/barco.service';

@Component({
  selector: 'app-barco',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './barco.html',
  styleUrl: './barco.css',
})
export class BarcoComponent implements OnInit {
  barcos: BarcoResumen[] = [];
  cargando = false;
  mensaje = '';
  error = '';

  constructor(
    private barcoService: BarcoService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargando = true;
    this.barcoService.getUserMe().subscribe({
      next: (res) => {
        const role = (res?.user?.role ?? '').toUpperCase();
        if (role !== 'ADMIN' && role !== 'ADMINISTRADOR') {
          this.router.navigate(['/barco-detalle']);
          return;
        }

        this.barcoService.getBarcos().subscribe({
          next: (data) => {
            this.barcos = data?.barcos ?? [];
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

  goDetalle(item: BarcoResumen) {
    this.router.navigate(['/barco-detalle', item.idBarco], {
      state: { barco: item }
    });
  }

  nuevoBarco() {
    this.router.navigate(['/barco-detalle']);
  }

  eliminarBarco(item: BarcoResumen, event: Event) {
    event.stopPropagation();
    this.mensaje = '';
    this.error = '';
    if (!confirm(`Eliminar el barco "${item.nombre}"?`)) {
      return;
    }

    this.barcoService.deleteById(item.idBarco).subscribe({
      next: () => {
        this.barcos = this.barcos.filter((barco) => barco.idBarco !== item.idBarco);
        this.mensaje = 'Barco eliminado correctamente.';
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensaje = '';
        this.error = 'No se pudo eliminar el barco.';
        this.cdr.detectChanges();
      }
    });
  }
}
