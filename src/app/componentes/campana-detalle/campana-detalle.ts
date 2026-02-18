import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { CampanaService } from '../../services/campana.service';
import { Campana } from '../../models/campana';
import { BarcoService, BarcoResumen } from '../../services/barco.service';
import { BarcoSearchSelectComponent } from '../barco-search-select/barco-search-select';
import { map, switchMap } from 'rxjs';

@Component({
  selector: 'app-campana-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, BarcoSearchSelectComponent],
  templateUrl: './campana-detalle.html',
  styleUrl: './campana-detalle.css',
})
export class CampanaDetalleComponent implements OnInit {
  private readonly FECHA_SIN_CADUCIDAD = '2999-12-31';
  campanaNombre = 'Campana';
  campana: Campana = this.emptyCampana();
  barcosDisponibles: BarcoResumen[] = [];
  selectedBarcoId = '';
  avisoBarcoCaducado = '';
  mensaje = '';
  targetCampanaId = '';
  creando = false;

  constructor(
    private campanaService: CampanaService,
    private barcoService: BarcoService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const paramId = this.route.snapshot.paramMap.get('id');
    const stateCampana = this.router.getCurrentNavigation()?.extras.state?.['campana'] ?? history.state?.campana;
    this.targetCampanaId = paramId || stateCampana?.idCampanas || stateCampana?.idCampana || '';
    this.creando = !this.targetCampanaId;
    this.cargarBarcos();

    if (stateCampana) {
      this.campana = {
        ...this.emptyCampana(),
        ...stateCampana
      };
      this.syncCampanaFields();
      this.campanaNombre = this.campana.nombre || 'Campana';
    } else if (this.targetCampanaId) {
      this.cargarCampanaPorId(this.targetCampanaId);
    }
  }

  save() {
    this.mensaje = '';
    this.selectedBarcoId = this.selectedBarcoId || String(this.campana.idBarco ?? '').trim();
    this.campana.idBarco = this.selectedBarcoId;
    this.campana.fechaDesde = this.toDateInput(this.campana.fechaDesde);
    this.campana.fechaHasta = this.toDateInput(this.campana.fechaHasta);
    this.campana.motivo = String(this.campana.motivo ?? '').trim();

    if (!this.campana.nombre?.trim()) {
      this.mensaje = 'El nombre es obligatorio.';
      return;
    }
    if (!this.selectedBarcoId) {
      this.mensaje = 'Selecciona un barco.';
      return;
    }
    if (!this.campana.fechaDesde) {
      this.mensaje = 'La fecha desde es obligatoria.';
      return;
    }
    if (!this.campana.fechaHasta) {
      this.mensaje = 'La fecha hasta es obligatoria.';
      return;
    }
    if (!String(this.campana.motivo ?? '').trim()) {
      this.mensaje = 'El motivo es obligatorio.';
      return;
    }

    const desde = new Date(this.campana.fechaDesde);
    const hasta = new Date(this.campana.fechaHasta);
    if (!Number.isNaN(desde.getTime()) && !Number.isNaN(hasta.getTime()) && hasta < desde) {
      this.mensaje = 'La fecha hasta no puede ser menor que la fecha desde.';
      return;
    }

    const createOrUpdate$ = this.creando
      ? this.resolveNextCampanaId().pipe(
          switchMap((nextId) => {
            const payload = this.buildPayload(nextId);
            return this.campanaService.create(payload);
          })
        )
      : this.campanaService.updateById(this.targetCampanaId, this.buildPayload(this.targetCampanaId));

    createOrUpdate$.subscribe({
      next: (res: any) => {
        const successMsg = this.creando ? 'Campana creada.' : 'Datos guardados.';
        this.mensaje = successMsg;
        window.alert(successMsg);
        if (this.creando) {
          const newId = String(res?.idCampanas ?? res?.idCampana ?? this.campana.idCampanas ?? this.campana.idCampana ?? '').trim();
          this.targetCampanaId = newId;
          this.campana.idCampana = newId;
          this.campana.idCampanas = newId;
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
      idCampanas: '',
      nombre: '',
      idBarco: '',
      fechaDesde: '',
      fechaHasta: '',
      motivo: ''
    };
  }

  private cargarBarcos() {
    this.barcoService.getBarcos().subscribe({
      next: (res) => {
        this.barcosDisponibles = res?.barcos ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.barcosDisponibles = [];
        this.cdr.detectChanges();
      }
    });
  }

  private syncCampanaFields() {
    const raw: any = this.campana ?? {};
    const idCampana = String(
      raw.idcampanas ?? raw.idCampanas ?? raw.idCampana ?? raw.id_campana ?? ''
    ).trim();
    const idBarco = String(
      raw.idbarco ?? raw.idBarco ?? raw.id_barco ?? ''
    ).trim();
    this.campana.idCampana = idCampana;
    this.campana.idCampanas = idCampana;
    this.selectedBarcoId = idBarco;
    this.campana.idBarco = idBarco;
    this.campana.fechaDesde = this.toDateInput(
      raw.fechadesde ?? raw.fechaDesde ?? raw.fecha_desde
    );
    this.campana.fechaHasta = this.toDateInput(
      raw.fechahasta ?? raw.fechaHasta ?? raw.fecha_hasta
    );
    this.campana.motivo = String(raw.motivo ?? '').trim();
    this.validarCaducidadBarco(idBarco);
  }

  private toDateInput(value: unknown) {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }
    return raw.includes('T') ? raw.split('T')[0] : raw.slice(0, 10);
  }

  private cargarCampanaPorId(idCampana: string) {
    this.campanaService.getById(idCampana).subscribe({
      next: (data) => {
        const profile = data?.campana ?? data ?? {};
        this.campana = {
          ...this.emptyCampana(),
          ...profile
        };
        this.syncCampanaFields();
        this.campanaNombre = this.campana.nombre || 'Campana';
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensaje = 'No se pudo cargar la campana.';
      }
    });
  }

  private buildPayload(idCampana: string) {
    const id = String(idCampana ?? '').trim();
    const nombre = String(this.campana.nombre ?? '').trim();
    const fechaDesde = this.toDateInput(this.campana.fechaDesde);
    const fechaHasta = this.toDateInput(this.campana.fechaHasta);
    const idBarco = String(this.selectedBarcoId ?? '').trim();
    const motivo = String(this.campana.motivo ?? '').trim();

    const basePayload = {
      idcampanas: id,
      nombre,
      fechadesde: fechaDesde,
      fechahasta: fechaHasta,
      idbarco: idBarco,
      motivo
    };

    return {
      ...basePayload,
      idCampanas: id,
      fechaDesde,
      fechaHasta,
      idBarco,
      campana: basePayload
    };
  }

  private resolveNextCampanaId() {
    return this.campanaService.getCampanas().pipe(
      map((res) => {
        const items = res?.campanas ?? [];
        const maxId = items.reduce((max, item: any) => {
          const raw = String(item?.idCampanas ?? item?.idCampana ?? '').trim();
          const num = /^\d+$/.test(raw) ? Number(raw) : 0;
          return Math.max(max, num);
        }, 0);
        const next = maxId + 1;
        return String(next).padStart(5, '0');
      })
    );
  }

  onBarcoSelected(idBarco: string) {
    this.selectedBarcoId = idBarco;
    this.campana.idBarco = idBarco;
    this.validarCaducidadBarco(idBarco);
  }

  private validarCaducidadBarco(idBarco: string) {
    const id = String(idBarco ?? '').trim();
    if (!id) {
      this.avisoBarcoCaducado = '';
      this.cdr.detectChanges();
      return;
    }

    this.barcoService.getDocumentosByBarcoId(id).subscribe({
      next: (res) => {
        const docs = res?.documentos ?? [];
        const tieneCaducados = docs.some((doc: any) => this.esDocumentoCaducado(doc?.fecha_caducidad));
        this.avisoBarcoCaducado = tieneCaducados
          ? 'Aviso: el barco seleccionado tiene documentos caducados.'
          : '';
        this.cdr.detectChanges();
      },
      error: () => {
        this.avisoBarcoCaducado = '';
        this.cdr.detectChanges();
      }
    });
  }

  private esDocumentoCaducado(fechaCaducidad?: string) {
    const raw = this.toDateInput(fechaCaducidad);
    if (!raw || raw === this.FECHA_SIN_CADUCIDAD) {
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

}
