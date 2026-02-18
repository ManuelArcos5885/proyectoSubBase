import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { BarcoService, BarcoResumen } from '../../services/barco.service';
import { catchError, forkJoin, map, of } from 'rxjs';

@Component({
  selector: 'app-barco',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './barco.html',
  styleUrl: './barco.css',
})
export class BarcoComponent implements OnInit {
  private readonly FECHA_SIN_CADUCIDAD = '2999-12-31';
  barcos: BarcoResumen[] = [];
  caducadosPorBarcoId: Record<string, boolean> = {};
  avisoCaducidad = '';
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
            this.revisarCaducidadBarcos();
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

  tieneDocumentosCaducados(idBarco: string) {
    return !!this.caducadosPorBarcoId[idBarco];
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
        delete this.caducadosPorBarcoId[item.idBarco];
        this.actualizarAvisoCaducidad();
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

  private revisarCaducidadBarcos() {
    if (!this.barcos.length) {
      this.caducadosPorBarcoId = {};
      this.avisoCaducidad = '';
      return;
    }

    const consultas = this.barcos.map((item) =>
      this.barcoService.getDocumentosByBarcoId(item.idBarco).pipe(
        map((res) => {
          const docs = res?.documentos ?? [];
          const tieneCaducados = docs.some((doc: any) =>
            this.esDocumentoCaducado(doc?.fecha_caducidad)
          );
          return { idBarco: item.idBarco, tieneCaducados };
        }),
        catchError(() => of({ idBarco: item.idBarco, tieneCaducados: false }))
      )
    );

    forkJoin(consultas).subscribe({
      next: (resultados) => {
        const mapa: Record<string, boolean> = {};
        resultados.forEach((r) => {
          mapa[r.idBarco] = r.tieneCaducados;
        });
        this.caducadosPorBarcoId = mapa;
        this.actualizarAvisoCaducidad();
        this.cdr.detectChanges();
      },
      error: () => {
        this.caducadosPorBarcoId = {};
        this.avisoCaducidad = '';
        this.cdr.detectChanges();
      }
    });
  }

  private actualizarAvisoCaducidad() {
    const total = Object.values(this.caducadosPorBarcoId).filter(Boolean).length;
    this.avisoCaducidad = total > 0
      ? `Hay ${total} barco(s) con documentos caducados.`
      : '';
  }

  private esDocumentoCaducado(fechaCaducidad?: string) {
    const raw = this.dateOnly(fechaCaducidad);
    if (!raw) {
      return false;
    }

    const fecha = new Date(raw);
    if (Number.isNaN(fecha.getTime())) {
      return false;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);
    return fecha < hoy;
  }

  private dateOnly(value?: string) {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }
    const normalized = raw.includes('T') ? raw.split('T')[0] : raw.slice(0, 10);
    return normalized === this.FECHA_SIN_CADUCIDAD ? '' : normalized;
  }
}
