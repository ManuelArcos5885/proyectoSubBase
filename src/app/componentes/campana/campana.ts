import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { CampanaService, CampanaResumen } from '../../services/campana.service';

@Component({
  selector: 'app-campana',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './campana.html',
  styleUrl: './campana.css',
})
export class CampanaComponent implements OnInit {
  campanas: CampanaResumen[] = [];
  cargando = false;
  mensaje = '';
  error = '';

  constructor(
    private campanaService: CampanaService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargando = true;
    this.campanaService.getUserMe().subscribe({
      next: (res) => {
        const role = (res?.user?.role ?? '').toUpperCase();
        if (role !== 'ADMIN' && role !== 'ADMINISTRADOR') {
          this.error = 'No autorizado.';
          this.cargando = false;
          this.cdr.detectChanges();
          return;
        }

        this.campanaService.getCampanas().subscribe({
          next: (data) => {
            const raw = data?.campanas ?? [];
            this.campanas = raw.map((item) => this.normalizeCampanaResumen(item));
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

  goDetalle(item: CampanaResumen) {
    this.router.navigate(['/campana-detalle', item.idCampana], {
      state: { campana: item }
    });
  }

  nuevaCampana() {
    this.router.navigate(['/campana-detalle']);
  }

  eliminarCampana(item: CampanaResumen, event: Event) {
    event.stopPropagation();
    this.mensaje = '';
    this.error = '';
    if (!confirm(`Eliminar la campana "${item.nombre}"?`)) {
      return;
    }

    this.campanaService.deleteById(item.idCampana).subscribe({
      next: () => {
        this.campanas = this.campanas.filter((campana) => campana.idCampana !== item.idCampana);
        this.mensaje = 'Campana eliminada correctamente.';
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensaje = '';
        this.error = 'No se pudo eliminar la campana.';
        this.cdr.detectChanges();
      }
    });
  }

  fechaLabel(value?: string) {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '-';
    }
    const normalized = raw.includes('T') ? raw.split('T')[0] : raw.slice(0, 10);
    const fecha = new Date(normalized);
    return Number.isNaN(fecha.getTime())
      ? normalized
      : new Intl.DateTimeFormat('es-ES').format(fecha);
  }

  private normalizeCampanaResumen(item: any): CampanaResumen {
    const id = String(item?.idCampanas ?? item?.idCampana ?? item?.id_campana ?? '').trim();
    return {
      idCampana: id,
      idCampanas: id,
      nombre: String(item?.nombre ?? ''),
      idBarco: String(item?.idBarco ?? item?.id_barco ?? ''),
      fechaDesde: String(item?.fechaDesde ?? item?.fecha_desde ?? ''),
      fechaHasta: String(item?.fechaHasta ?? item?.fecha_hasta ?? ''),
      motivo: String(item?.motivo ?? '')
    };
  }
}
