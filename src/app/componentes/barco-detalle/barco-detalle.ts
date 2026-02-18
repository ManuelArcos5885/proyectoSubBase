import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { StorageService } from '../../services/storage.service';
import { BarcoService } from '../../services/barco.service';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { Barco } from '../../models/barco';
import { TripulanteService, TripulanteResumen } from '../../services/tripulante.service';
import { TripulanteSearchSelectComponent } from '../tripulante-search-select/tripulante-search-select';
import { LoadingOverlayComponent } from '../loading-overlay/loading-overlay';

@Component({
  selector: 'app-barco-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, TripulanteSearchSelectComponent, LoadingOverlayComponent],
  templateUrl: './barco-detalle.html',
  styleUrl: './barco-detalle.css',
})
export class BarcoDetalleComponent implements OnInit {
  private readonly FECHA_SIN_CADUCIDAD = '2999-12-31';
  activeTab: 'datos' | 'documentos' | 'tripulantes' = 'datos';
  barcoNombre = 'Barco';
  barco: Barco = this.emptyBarco();
  mensaje = '';
  documentoMensaje = '';
  documentoTipo:
    | 'CERTIFICADO_MEDICO_APTITUD_EMBARQUE'
    | 'CONTRATO_EMBARCO_O_RELACION_LABORAL'
    | 'PASAPORTE_DNI_NIE'
    | 'CERTIFICADOS_ESPECIALIDAD'
    | 'TITULO_PROFESIONAL_MARITIMO'
    | 'ROL_DESPACHO_DOTACION_MINIMA_SEGURIDAD'
    | 'LIBRETA_MARITIMA'
    | 'OTRO' = 'CERTIFICADO_MEDICO_APTITUD_EMBARQUE';
  fechaCaducidad = '';
  tripulantesMensaje = '';
  barcoNoPuedeZarpar = false;
  avisoZarpe = '';
  tieneDocumentosBarcoCaducados = false;
  tripulantesCaducadosCount = 0;
  caducadosPorTripulanteId: Record<string, boolean> = {};
  selectedFile: File | null = null;
  subiendo = false;
  documentos: DocumentoItem[] = [];
  editandoCaducidadPath = '';
  nuevaFechaCaducidad = '';
  guardandoCaducidad = false;
  tripulantes: TripulanteBarcoItem[] = [];
  tripulantesDisponibles: TripulanteResumen[] = [];
  todosTripulantes: TripulanteResumen[] = [];
  selectedTripulanteId = '';
  cargandoDocumentos = false;
  cargandoTripulantes = false;
  targetBarcoId = '';
  creando = false;

  constructor(
    private barcoService: BarcoService,
    private storage: StorageService,
    private tripulanteService: TripulanteService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const paramId = this.route.snapshot.paramMap.get('id');
    const stateBarco = this.router.getCurrentNavigation()?.extras.state?.['barco'] ?? history.state?.barco;
    this.targetBarcoId = paramId || stateBarco?.idBarco || '';
    this.creando = !this.targetBarcoId;

    if (stateBarco) {
      this.barco = {
        ...this.emptyBarco(),
        ...stateBarco
      };
      this.barcoNombre = this.barco.nombre || 'Barco';
      if (this.targetBarcoId) {
        this.validarCaducidadDocumentosBarco(this.targetBarcoId);
      }
    } else if (this.targetBarcoId) {
      this.cargarBarcoPorId(this.targetBarcoId);
      this.validarCaducidadDocumentosBarco(this.targetBarcoId);
    }
  }

  setTab(tab: 'datos' | 'documentos' | 'tripulantes') {
    this.activeTab = tab;
    if (tab === 'documentos' && !this.cargandoDocumentos) {
      setTimeout(() => {
        if (this.targetBarcoId) {
          this.cargarDocumentosPorId(this.targetBarcoId);
        }
      });
    }
    if (tab === 'tripulantes' && !this.cargandoTripulantes) {
      setTimeout(() => {
        if (this.targetBarcoId) {
          this.cargarTripulantesPorBarco(this.targetBarcoId);
          this.cargarTripulantesDisponibles();
        }
      });
    }
  }

  save() {
    this.mensaje = '';
    if (!this.barco.nombre?.trim()) {
      this.mensaje = 'El nombre es obligatorio.';
      return;
    }
    if (!this.barco.fecha) {
      this.mensaje = 'La fecha es obligatoria.';
      return;
    }

    const action = this.creando
      ? this.barcoService.create(this.barco)
      : this.barcoService.updateById(this.targetBarcoId, this.barco);

    action.subscribe({
      next: (res: any) => {
        this.showSuccess(this.creando ? 'Barco creado correctamente.' : 'Se han guardado los cambios correctamente.');
        if (this.creando) {
          this.targetBarcoId = res?.idBarco || this.targetBarcoId;
          this.creando = false;
        }
      },
      error: (err) => {
        const backendMessage = err?.error?.error ? String(err.error.error) : '';
        this.showError(backendMessage || (this.creando
          ? 'No se pudo crear el barco.'
          : 'No se pudieron guardar los datos.'));
      }
    });
  }

  onFileSelected(event: Event) {
    this.documentoMensaje = '';
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;

    if (file && file.type !== 'application/pdf') {
      this.documentoMensaje = 'Solo se permiten archivos PDF.';
      this.selectedFile = null;
    }
  }

  subirDocumento() {
    this.documentoMensaje = '';

    if (!this.selectedFile) {
      this.documentoMensaje = 'Selecciona un archivo PDF.';
      return;
    }
    if (!this.documentoTipo) {
      this.documentoMensaje = 'Selecciona el tipo de documento.';
      return;
    }
    if (!this.targetBarcoId) {
      this.documentoMensaje = 'No se pudo identificar el barco.';
      return;
    }

    const safeName = this.sanitizeFileName(this.selectedFile.name);
    const path = `${this.targetBarcoId}/${Date.now()}_${safeName}`;

    this.subiendo = true;
    this.storage
      .uploadPdfToBucket(this.selectedFile, path, 'certificados-barcos')
      .pipe(
        catchError(() => this.storage.uploadPdfToBucket(this.selectedFile as File, path, 'certificados_barcos')),
        catchError(() => this.storage.uploadPdfToBucket(this.selectedFile as File, path, 'certificados')),
        switchMap(() =>
          this.barcoService.createDocumento(this.targetBarcoId, {
            tipo: this.documentoTipo,
            archivo_path: path,
            fecha_caducidad: this.normalizeFechaCaducidad(this.fechaCaducidad)
          })
        ),
        finalize(() => {
          this.subiendo = false;
        })
      )
      .subscribe({
        next: () => {
          this.documentoMensaje = 'Documento subido correctamente.';
          this.selectedFile = null;
          this.fechaCaducidad = '';
          this.cargarDocumentosPorId(this.targetBarcoId);
        },
        error: (err) => {
          this.documentoMensaje = this.extractBackendError(err) || 'No se pudo subir el documento.';
        }
      });
  }

  descargarDocumento(documento: DocumentoItem) {
    this.storage.downloadPdfFromBucket(documento.archivo_path, 'certificados-barcos')
      .pipe(
        catchError(() => this.storage.downloadPdfFromBucket(documento.archivo_path, 'certificados_barcos')),
        catchError(() => this.storage.downloadPdfFromBucket(documento.archivo_path, 'certificados'))
      )
      .subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.fileNameFromPath(documento.archivo_path);
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.documentoMensaje = 'No se pudo descargar el documento.';
      }
    });
  }

  quitarDocumento(documento: DocumentoItem) {
    this.documentoMensaje = '';

    if (!this.targetBarcoId) {
      this.documentoMensaje = 'No se pudo identificar el barco.';
      return;
    }
    if (!documento?.archivo_path) {
      this.documentoMensaje = 'No se pudo identificar el documento.';
      return;
    }

    const nombre = this.fileNameFromPath(documento.archivo_path);
    if (!confirm(`Quitar el documento "${nombre}"?`)) {
      return;
    }

    this.barcoService.removeDocumento(this.targetBarcoId, documento.archivo_path).subscribe({
      next: () => {
        this.documentoMensaje = 'Documento quitado.';
        this.cargarDocumentosPorId(this.targetBarcoId);
      },
      error: (err) => {
        this.documentoMensaje = this.extractBackendError(err) || 'No se pudo quitar el documento.';
      }
    });
  }

  editarCaducidad(documento: DocumentoItem) {
    if (!documento?.archivo_path) {
      return;
    }

    this.documentoMensaje = '';
    this.editandoCaducidadPath = documento.archivo_path;
    this.nuevaFechaCaducidad = this.dateOnly(documento.fecha_caducidad);
  }

  cancelarEdicionCaducidad() {
    if (this.guardandoCaducidad) {
      return;
    }

    this.editandoCaducidadPath = '';
    this.nuevaFechaCaducidad = '';
  }

  guardarCaducidad(documento: DocumentoItem) {
    this.documentoMensaje = '';

    if (!this.targetBarcoId) {
      this.documentoMensaje = 'No se pudo identificar el barco.';
      return;
    }
    if (!documento?.archivo_path) {
      this.documentoMensaje = 'No se pudo identificar el documento.';
      return;
    }
    this.guardandoCaducidad = true;
    const fechaCaducidad = this.normalizeFechaCaducidad(this.nuevaFechaCaducidad);
    this.barcoService.updateDocumentoCaducidad(
      this.targetBarcoId,
      documento.archivo_path,
      documento.tipo,
      fechaCaducidad
    ).pipe(
      finalize(() => {
        this.guardandoCaducidad = false;
      })
    ).subscribe({
      next: () => {
        this.documentoMensaje = 'Fecha de caducidad actualizada.';
        window.alert('Fecha de caducidad guardada correctamente.');
        this.editandoCaducidadPath = '';
        this.nuevaFechaCaducidad = '';
        this.cargarDocumentosPorId(this.targetBarcoId);
      },
      error: (err) => {
        this.documentoMensaje = this.extractBackendError(err) || 'No se pudo actualizar la fecha de caducidad.';
      }
    });
  }

  agregarTripulante() {
    this.tripulantesMensaje = '';
    if (!this.targetBarcoId) {
      this.tripulantesMensaje = 'No se pudo identificar el barco.';
      return;
    }
    if (!this.selectedTripulanteId) {
      this.tripulantesMensaje = 'Selecciona un tripulante.';
      return;
    }

    this.tripulanteService.getDocumentosByUserId(this.selectedTripulanteId).subscribe({
      next: (res) => {
        const documentos = res?.documentos ?? [];
        const tieneCaducados = documentos.some((doc: any) =>
          this.esDocumentoCaducado(doc?.fecha_caducidad)
        );

        if (tieneCaducados) {
          this.tripulantesMensaje = 'No se puede agregar: el tripulante tiene documentos caducados.';
          window.alert('No se puede agregar el tripulante al barco porque tiene documentos caducados.');
          this.cdr.detectChanges();
          return;
        }

        this.barcoService.addTripulanteToBarco(this.targetBarcoId, {
          idTripulante: this.selectedTripulanteId
        }).subscribe({
          next: () => {
            this.tripulantesMensaje = 'Tripulante agregado.';
            this.selectedTripulanteId = '';
            this.cargarTripulantesPorBarco(this.targetBarcoId);
          },
          error: () => {
            this.tripulantesMensaje = 'No se pudo agregar el tripulante.';
          }
        });
      },
      error: () => {
        this.tripulantesMensaje = 'No se pudieron validar los documentos del tripulante.';
        this.cdr.detectChanges();
      }
    });
  }

  quitarTripulante(item: TripulanteBarcoItem) {
    if (!this.targetBarcoId) {
      this.tripulantesMensaje = 'No se pudo identificar el barco.';
      return;
    }
    const nombre = [item.nombre, item.apellidos].filter(Boolean).join(' ');
    if (!confirm(`Quitar a ${nombre || 'este tripulante'} del barco?`)) {
      return;
    }

    this.barcoService.removeTripulanteFromBarco(this.targetBarcoId, item.idTripulante).subscribe({
      next: () => {
        this.tripulantesMensaje = 'Tripulante quitado.';
        this.cargarTripulantesPorBarco(this.targetBarcoId);
      },
      error: () => {
        this.tripulantesMensaje = 'No se pudo quitar el tripulante.';
      }
    });
  }

  goToTripulanteDetalle(item: TripulanteBarcoItem) {
    if (!item?.idTripulante) {
      return;
    }

    this.router.navigate(['/tripulante-detalle', item.idTripulante], {
      state: {
        tripulante: {
          user_id: item.idTripulante,
          nombre: item.nombre ?? '',
          apellidos: item.apellidos ?? '',
          telefono: item.telefono ?? '',
          nacionalidad: item.nacionalidad ?? '',
          puesto: item.puesto ?? ''
        }
      }
    });
  }

  fileNameFromPath(path: string) {
    const parts = path.split('/');
    return parts[parts.length - 1] || 'documento.pdf';
  }

  tieneDocumentosCaducadosTripulante(idTripulante: string) {
    return !!this.caducadosPorTripulanteId[idTripulante];
  }

  caducidadLabel(value?: string) {
    const normalized = this.dateOnly(value);
    if (!normalized) {
      return 'Sin caducidad';
    }
    const fecha = new Date(normalized);
    return Number.isNaN(fecha.getTime())
      ? normalized
      : new Intl.DateTimeFormat('es-ES').format(fecha);
  }

  documentoCaducado(documento: DocumentoItem) {
    return this.esDocumentoCaducado(documento?.fecha_caducidad);
  }
  private showSuccess(text: string) {
    this.mensaje = text;
    this.cdr.detectChanges();
  }

  private showError(text: string) {
    this.mensaje = text;
    this.cdr.detectChanges();
  }

  private emptyBarco(): Barco {
    return {
      idBarco: '',
      nombre: '',
      fecha: ''
    };
  }

  private cargarBarcoPorId(barcoId: string) {
    this.barcoService.getById(barcoId).subscribe({
      next: (data) => {
        const profile = data?.barco ?? data ?? {};
        this.barco = {
          ...this.emptyBarco(),
          ...profile
        };
        this.barcoNombre = this.barco.nombre || 'Barco';
        this.cdr.detectChanges();
      },
      error: () => {
        this.showError('No se pudo cargar el barco.');
      }
    });
  }

  private cargarDocumentosPorId(barcoId: string) {
    this.cargandoDocumentos = true;
    this.barcoService.getDocumentosByBarcoId(barcoId).subscribe({
      next: (res) => {
        this.finishDocumentos(res?.documentos ?? []);
      },
      error: () => {
        this.finishDocumentosError('No se pudieron cargar los documentos.');
      }
    });
  }

  private finishDocumentos(items: DocumentoItem[]) {
    this.documentos = items;
    this.tieneDocumentosBarcoCaducados = items.some((doc) =>
      this.esDocumentoCaducado(doc?.fecha_caducidad)
    );
    this.actualizarAvisoZarpe();
    this.cargandoDocumentos = false;
    this.cdr.detectChanges();
  }

  private finishDocumentosError(message: string) {
    this.documentoMensaje = message;
    this.cargandoDocumentos = false;
    this.cdr.detectChanges();
  }

  private cargarTripulantesPorBarco(barcoId: string) {
    this.cargandoTripulantes = true;
    this.barcoService.getTripulantesByBarcoId(barcoId).subscribe({
      next: (res) => {
        this.tripulantes = res?.tripulantes ?? [];
        this.revisarCaducidadTripulantes();
        this.cargandoTripulantes = false;
        this.actualizarDisponibles();
        this.cdr.detectChanges();
      },
      error: () => {
        this.tripulantesMensaje = 'No se pudieron cargar los tripulantes.';
        this.cargandoTripulantes = false;
        this.cdr.detectChanges();
      }
    });
  }

  private cargarTripulantesDisponibles() {
    this.tripulanteService.getTripulantes().subscribe({
      next: (res) => {
        this.todosTripulantes = res?.tripulantes ?? [];
        this.actualizarDisponibles();
        this.cdr.detectChanges();
      },
      error: () => {
        this.tripulantesMensaje = 'No se pudo cargar el listado de tripulantes.';
        this.cdr.detectChanges();
      }
    });
  }

  private actualizarDisponibles() {
    const asignados = new Set(this.tripulantes.map((t) => t.idTripulante));
    this.tripulantesDisponibles = (this.todosTripulantes ?? []).filter(
      (t) => !asignados.has(t.user_id)
    );
  }

  private revisarCaducidadTripulantes() {
    if (!this.tripulantes.length) {
      this.caducadosPorTripulanteId = {};
      this.tripulantesCaducadosCount = 0;
      this.actualizarAvisoZarpe();
      return;
    }

    const consultas = this.tripulantes.map((item) =>
      this.tripulanteService.getDocumentosByUserId(item.idTripulante).pipe(
        map((res) => {
          const documentos = res?.documentos ?? [];
          const tieneCaducados = documentos.some((doc: any) =>
            this.esDocumentoCaducado(doc?.fecha_caducidad)
          );
          return { userId: item.idTripulante, tieneCaducados };
        }),
        catchError(() => of({ userId: item.idTripulante, tieneCaducados: false }))
      )
    );

    forkJoin(consultas).subscribe({
      next: (resultados) => {
        const mapa: Record<string, boolean> = {};
        resultados.forEach((r) => {
          mapa[r.userId] = r.tieneCaducados;
        });
        this.caducadosPorTripulanteId = mapa;
        this.tripulantesCaducadosCount = Object.values(mapa).filter(Boolean).length;
        this.actualizarAvisoZarpe();
        this.cdr.detectChanges();
      },
      error: () => {
        this.caducadosPorTripulanteId = {};
        this.tripulantesCaducadosCount = 0;
        this.actualizarAvisoZarpe();
        this.cdr.detectChanges();
      }
    });
  }

  private validarCaducidadDocumentosBarco(barcoId: string) {
    this.barcoService.getDocumentosByBarcoId(barcoId).subscribe({
      next: (res) => {
        const docs = res?.documentos ?? [];
        this.tieneDocumentosBarcoCaducados = docs.some((doc: any) =>
          this.esDocumentoCaducado(doc?.fecha_caducidad)
        );
        this.actualizarAvisoZarpe();
        this.cdr.detectChanges();
      },
      error: () => {
        this.tieneDocumentosBarcoCaducados = false;
        this.actualizarAvisoZarpe();
        this.cdr.detectChanges();
      }
    });
  }

  private actualizarAvisoZarpe() {
    const motivos: string[] = [];
    if (this.tieneDocumentosBarcoCaducados) {
      motivos.push('documentos del barco caducados');
    }
    if (this.tripulantesCaducadosCount > 0) {
      motivos.push(`${this.tripulantesCaducadosCount} tripulante(s) con documentos caducados`);
    }

    this.barcoNoPuedeZarpar = motivos.length > 0;
    this.avisoZarpe = this.barcoNoPuedeZarpar
      ? `Este barco no puede zarpar al mar: ${motivos.join(' y ')}.`
      : '';
  }

  private sanitizeFileName(name: string) {
    return name.replace(/\\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  }

  private dateOnly(value?: string) {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }
    const normalized = raw.includes('T') ? raw.split('T')[0] : raw.slice(0, 10);
    return normalized === this.FECHA_SIN_CADUCIDAD ? '' : normalized;
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

  private normalizeFechaCaducidad(value?: string) {
    const raw = String(value ?? '').trim();
    return raw || this.FECHA_SIN_CADUCIDAD;
  }

  private extractBackendError(err: any) {
    const raw = err?.error?.error ?? err?.error;
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    if (typeof raw?.message === 'string') {
      const code = raw?.code ? ` (${raw.code})` : '';
      const details = raw?.details ? ` - ${raw.details}` : '';
      return `${raw.message}${code}${details}`;
    }
    try {
      return JSON.stringify(raw);
    } catch {
      return String(raw);
    }
  }
}

interface DocumentoItem {
  id?: number | string;
  tipo: string;
  archivo_path: string;
  created_at?: string;
  fecha_caducidad?: string;
}

interface TripulanteBarcoItem {
  idTripulante: string;
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  nacionalidad?: string;
  puesto?: string;
  created_at?: string;
}

