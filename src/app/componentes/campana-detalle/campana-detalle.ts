import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { CampanaService } from '../../services/campana.service';
import { Campana } from '../../models/campana';

@Component({
  selector: 'app-campana-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './campana-detalle.html',
  styleUrl: './campana-detalle.css',
})
export class CampanaDetalleComponent implements OnInit {
  campanaNombre = 'Campana';
  campana: Campana = this.emptyCampana();
  mensaje = '';
  targetCampanaId = '';
  creando = false;

  constructor(
    private campanaService: CampanaService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const paramId = this.route.snapshot.paramMap.get('id');
    const stateCampana = this.router.getCurrentNavigation()?.extras.state?.['campana'] ?? history.state?.campana;
    this.targetCampanaId = paramId || stateCampana?.idCampana || '';
    this.creando = !this.targetCampanaId;

    if (stateCampana) {
      this.campana = {
        ...this.emptyCampana(),
        ...stateCampana
      };
      this.campanaNombre = this.campana.nombre || 'Campana';
    } else if (this.targetCampanaId) {
      this.cargarCampanaPorId(this.targetCampanaId);
    }
  }

  save() {
    this.mensaje = '';
    if (!this.campana.nombre?.trim()) {
      this.mensaje = 'El nombre es obligatorio.';
      return;
    }

    const action = this.creando
      ? this.campanaService.create(this.campana)
      : this.campanaService.updateById(this.targetCampanaId, this.campana);

    action.subscribe({
      next: (res: any) => {
        this.mensaje = this.creando ? 'Campana creada.' : 'Datos guardados.';
        if (this.creando) {
          this.targetCampanaId = res?.idCampana || this.campana.idCampana;
          this.creando = false;
        }
      },
      error: (err) => {
        const backendMessage = err?.error?.error ? String(err.error.error) : '';
        this.mensaje = backendMessage || (this.creando
          ? 'No se pudo crear la campana.'
          : 'No se pudieron guardar los datos.');
      }
    });
  }

  private emptyCampana(): Campana {
    return {
      idCampana: '',
      nombre: ''
    };
  }

  private cargarCampanaPorId(idCampana: string) {
    this.campanaService.getById(idCampana).subscribe({
      next: (data) => {
        const profile = data?.campana ?? data ?? {};
        this.campana = {
          ...this.emptyCampana(),
          ...profile
        };
        this.campanaNombre = this.campana.nombre || 'Campana';
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensaje = 'No se pudo cargar la campana.';
      }
    });
  }

}
