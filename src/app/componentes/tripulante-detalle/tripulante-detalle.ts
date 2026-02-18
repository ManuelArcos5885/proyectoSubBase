import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { AuthService } from '../../services/auth.service';
import { TripulanteService } from '../../services/tripulante.service';
import { StorageService } from '../../services/storage.service';
import { Tripulante } from '../../models/tripulante';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { BarcoService } from '../../services/barco.service';
import { LoadingOverlayComponent } from '../loading-overlay/loading-overlay';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-tripulante-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, LoadingOverlayComponent],
  templateUrl: './tripulante-detalle.html',
  styleUrl: './tripulante-detalle.css',
})
export class TripulanteDetalleComponent implements OnInit {
  private readonly FECHA_SIN_CADUCIDAD = '2999-12-31';
  activeTab: 'datos' | 'documentos' | 'enroles' = 'datos';
  tripulanteNombre = 'Mi ficha';
  relatedUserEmail = '';
  userEmail = '';
  userId = '';
  targetUserId = '';
  canEdit = true;
  isAdmin = false;
  tripulante: Tripulante = this.emptyTripulante();
  mensaje = '';
  documentoMensaje = '';
  documentoTipo:
    | 'CERTIFICADO_NACIONAL_SEGURIDAD'
    | 'CERTIFICADO_NACIONAL_ARQUEO'
    | 'CERTIFICADO_SEGURIDAD_RADIOELECTRICA'
    | 'ACTA_ESTABILIDAD'
    | 'CERTIFICADO_NAVEGABILIDAD'
    | 'OTRO' = 'CERTIFICADO_NACIONAL_SEGURIDAD';
  fechaCaducidad = '';
  selectedFile: File | null = null;
  subiendo = false;
  documentos: DocumentoItem[] = [];
  cargandoDocumentos = false;
  tieneDocumentosCaducados = false;
  avisoCaducidad = '';
  editandoCaducidadPath = '';
  nuevaFechaCaducidad = '';
  guardandoCaducidad = false;
  enroles: EnrolBarcoItem[] = [];
  cargandoEnroles = false;
  enrolesMensaje = '';

  constructor(
    private auth: AuthService,
    private tripulanteService: TripulanteService,
    private userService: UserService,
    private barcoService: BarcoService,
    private storage: StorageService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.userEmail = this.auth.getEmail();
    const paramId = this.route.snapshot.paramMap.get('id');
    const currentUserId = this.auth.getUserIdFromToken() ?? '';
    const stateTripulante = this.router.getCurrentNavigation()?.extras.state?.['tripulante'] ?? history.state?.tripulante;
    this.targetUserId = paramId || stateTripulante?.user_id || currentUserId;
    this.canEdit = !paramId || this.targetUserId === currentUserId;
    this.relatedUserEmail = this.userEmail;
    this.cargarEmailRelacionado(this.targetUserId);

    this.tripulanteService.getUserMe().subscribe({
      next: (res) => {
        const role = (res?.user?.role ?? '').toUpperCase();
        this.isAdmin = role === 'ADMIN' || role === 'ADMINISTRADOR';
        this.canEdit = this.canEdit || this.isAdmin;
        this.cdr.detectChanges();
      }
    });

    if (paramId) {
      if (stateTripulante) {
        this.tripulante = {
          ...this.emptyTripulante(),
          ...stateTripulante
        };
        const fullName = `${this.tripulante.nombre} ${this.tripulante.apellidos}`.trim();
        this.tripulanteNombre = fullName || 'Ficha de tripulante';
      } else {
        this.cargarFichaPorId(this.targetUserId);
      }
      this.validarCaducidadDocumentos(this.targetUserId);
      return;
    }

    this.cargarFicha();
    this.validarCaducidadDocumentos();
  }

  setTab(tab: 'datos' | 'documentos' | 'enroles') {
    this.activeTab = tab;
    if (tab === 'documentos' && !this.cargandoDocumentos) {
      setTimeout(() => {
        if (this.targetUserId) {
          this.cargarDocumentosPorId(this.targetUserId);
        } else {
          this.cargarDocumentos();
        }
      });
    }
    if (tab === 'enroles' && !this.cargandoEnroles) {
      setTimeout(() => {
        this.cargarEnroles();
      });
    }
  }

  save() {
    if (!this.canEdit) {
      this.showError('No tienes permisos para editar esta ficha.');
      return;
    }

    this.mensaje = '';
    const action = this.isAdmin && this.targetUserId
      ? this.tripulanteService.updateById(this.targetUserId, this.tripulante)
      : this.tripulanteService.updateMe(this.tripulante);

    action.subscribe({
      next: () => {
        this.showSuccess('Datos guardados.');
      },
      error: () => {
        this.showError('No se pudieron guardar los datos.');
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
    if (!this.canEdit) {
      this.documentoMensaje = 'No tienes permisos para subir documentos.';
      return;
    }

    this.documentoMensaje = '';

    if (!this.selectedFile) {
      this.documentoMensaje = 'Selecciona un archivo PDF.';
      return;
    }
    if (!this.documentoTipo) {
      this.documentoMensaje = 'Selecciona el tipo de documento.';
      return;
    }
    const userId = this.userId || this.auth.getUserIdFromToken();
    if (!userId) {
      this.documentoMensaje = 'No se pudo identificar el usuario.';
      return;
    }

    const safeName = this.sanitizeFileName(this.selectedFile.name);
    const path = `${userId}/${Date.now()}_${safeName}`;

    this.subiendo = true;
    const createDocumento = this.isAdmin && this.targetUserId
      ? this.tripulanteService.createDocumentoByUserId(this.targetUserId, {
          tipo: this.documentoTipo,
          archivo_path: path,
          fecha_caducidad: this.normalizeFechaCaducidad(this.fechaCaducidad)
        })
      : this.tripulanteService.createDocumento({
          tipo: this.documentoTipo,
          archivo_path: path,
          fecha_caducidad: this.normalizeFechaCaducidad(this.fechaCaducidad)
        });

    this.storage
      .uploadPdf(this.selectedFile, path)
      .pipe(
        switchMap(() => createDocumento),
        finalize(() => {
          this.subiendo = false;
        })
      )
      .subscribe({
        next: () => {
          this.documentoMensaje = 'Documento subido correctamente.';
          this.selectedFile = null;
          this.documentoTipo = 'CERTIFICADO_NACIONAL_SEGURIDAD';
          this.fechaCaducidad = '';
          this.recargarDocumentosActuales();
        },
        error: () => {
          this.documentoMensaje = 'No se pudo subir el documento.';
        }
      });
  }

  descargarDocumento(documento: DocumentoItem) {
    this.storage.downloadPdf(documento.archivo_path).subscribe({
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
    if (!this.canEdit) {
      this.documentoMensaje = 'No tienes permisos para quitar documentos.';
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

    const action = this.isAdmin && this.targetUserId
      ? this.tripulanteService.removeDocumentoByUserId(this.targetUserId, documento.archivo_path)
      : this.tripulanteService.removeDocumento(documento.archivo_path);

    action.subscribe({
      next: () => {
        this.documentoMensaje = 'Documento quitado.';
        this.recargarDocumentosActuales();
      },
      error: () => {
        this.documentoMensaje = 'No se pudo quitar el documento.';
      }
    });
  }

  editarCaducidad(documento: DocumentoItem) {
    if (!this.canEdit || !documento?.archivo_path) {
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
    if (!this.canEdit) {
      this.documentoMensaje = 'No tienes permisos para editar documentos.';
      return;
    }
    if (!documento?.archivo_path) {
      this.documentoMensaje = 'No se pudo identificar el documento.';
      return;
    }
    this.guardandoCaducidad = true;
    const fechaCaducidad = this.normalizeFechaCaducidad(this.nuevaFechaCaducidad);
    const action = this.isAdmin && this.targetUserId
      ? this.tripulanteService.updateDocumentoCaducidadByUserId(
          this.targetUserId,
          documento.archivo_path,
          documento.tipo,
          fechaCaducidad
        )
      : this.tripulanteService.updateDocumentoCaducidad(
          documento.archivo_path,
          documento.tipo,
          fechaCaducidad
        );

    action.pipe(
      finalize(() => {
        this.guardandoCaducidad = false;
      })
    ).subscribe({
      next: () => {
        this.documentoMensaje = 'Fecha de caducidad actualizada.';
        window.alert('Fecha de caducidad guardada correctamente.');
        this.editandoCaducidadPath = '';
        this.nuevaFechaCaducidad = '';
        this.recargarDocumentosActuales();
      },
      error: () => {
        this.documentoMensaje = 'No se pudo actualizar la fecha de caducidad.';
      }
    });
  }

  fileNameFromPath(path: string) {
    const parts = path.split('/');
    return parts[parts.length - 1] || 'documento.pdf';
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

  private emptyTripulante(): Tripulante {
    return {
      nombre: '',
      apellidos: '',
      telefono: '',
      nacionalidad: '',
      puesto: ''
    };
  }

  private cargarFicha() {
    this.tripulanteService.getMe().subscribe({
      next: (data) => {
        const profile = data?.tripulante ?? data?.profile ?? data ?? {};
        this.tripulante = {
          ...this.emptyTripulante(),
          ...profile
        };

        const maybeUserId =
          data?.userId ??
          data?.user?.id ??
          data?.id ??
          profile?.user_id ??
          profile?.userId;

        if (maybeUserId) {
          this.userId = maybeUserId;
        }

        const fullName = `${this.tripulante.nombre} ${this.tripulante.apellidos}`.trim();
        this.tripulanteNombre = fullName || 'Mi ficha';
      },
      error: () => {
        this.showError('No se pudo cargar la ficha.');
      }
    });
  }

  private cargarDocumentos() {
    this.cargandoDocumentos = true;
    this.tripulanteService.getDocumentos().subscribe({
      next: (res) => {
        this.finishDocumentos(res?.documentos ?? []);
      },
      error: () => {
        this.finishDocumentosError('No se pudieron cargar los documentos.');
      }
    });
  }

  private cargarFichaPorId(userId: string) {
    this.tripulanteService.getById(userId).subscribe({
      next: (data) => {
        const profile = data?.tripulante ?? data ?? {};
        this.tripulante = {
          ...this.emptyTripulante(),
          ...profile
        };

        this.userId = userId;
        const fullName = `${this.tripulante.nombre} ${this.tripulante.apellidos}`.trim();
        this.tripulanteNombre = fullName || 'Ficha de tripulante';
      },
      error: () => {
        this.showError('No se pudo cargar la ficha.');
      }
    });
  }

  private cargarEmailRelacionado(userId: string) {
    const targetId = String(userId ?? '').trim();
    if (!targetId) {
      this.relatedUserEmail = this.userEmail;
      return;
    }

    this.userService.getById(targetId).subscribe({
      next: (res) => {
        const email = String(res?.user?.email ?? '').trim();
        this.relatedUserEmail = email || this.userEmail;
        this.cdr.detectChanges();
      },
      error: () => {
        this.relatedUserEmail = this.userEmail;
        this.cdr.detectChanges();
      }
    });
  }

  private cargarDocumentosPorId(userId: string) {
    this.cargandoDocumentos = true;
    this.tripulanteService.getDocumentosByUserId(userId).subscribe({
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
    this.actualizarAvisoCaducidad(items);
    this.cargandoDocumentos = false;
    this.cdr.detectChanges();
  }

  private finishDocumentosError(message: string) {
    this.documentoMensaje = message;
    this.cargandoDocumentos = false;
    this.cdr.detectChanges();
  }

  private sanitizeFileName(name: string) {
    return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  }

  private dateOnly(value?: string) {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }
    const normalized = raw.includes('T') ? raw.split('T')[0] : raw.slice(0, 10);
    return normalized === this.FECHA_SIN_CADUCIDAD ? '' : normalized;
  }

  private normalizeFechaCaducidad(value?: string) {
    const raw = String(value ?? '').trim();
    return raw || this.FECHA_SIN_CADUCIDAD;
  }

  private validarCaducidadDocumentos(userId?: string) {
    const targetId = userId || this.targetUserId;
    const action = targetId
      ? this.tripulanteService.getDocumentosByUserId(targetId)
      : this.tripulanteService.getDocumentos();

    action.subscribe({
      next: (res) => {
        this.actualizarAvisoCaducidad(res?.documentos ?? []);
        this.cdr.detectChanges();
      },
      error: () => {
        this.tieneDocumentosCaducados = false;
        this.avisoCaducidad = '';
        this.cdr.detectChanges();
      }
    });
  }

  private actualizarAvisoCaducidad(documentos: DocumentoItem[]) {
    this.tieneDocumentosCaducados = (documentos ?? []).some((doc) =>
      this.esDocumentoCaducado(doc?.fecha_caducidad)
    );
    this.avisoCaducidad = this.tieneDocumentosCaducados
      ? 'Aviso: este tripulante tiene documentos caducados.'
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

  private recargarDocumentosActuales() {
    if (this.isAdmin && this.targetUserId) {
      this.cargarDocumentosPorId(this.targetUserId);
      return;
    }
    this.cargarDocumentos();
  }

  private cargarEnroles() {
    this.enrolesMensaje = '';
    const tripulanteId = this.targetUserId || this.userId || this.auth.getUserIdFromToken() || '';
    if (!tripulanteId) {
      this.enrolesMensaje = 'No se pudo identificar el tripulante.';
      this.cdr.detectChanges();
      return;
    }

    this.cargandoEnroles = true;
    this.barcoService.getBarcos().pipe(
      switchMap((res) => {
        const barcos = res?.barcos ?? [];
        if (!barcos.length) {
          return of([] as EnrolBarcoItem[]);
        }

        return forkJoin(
          barcos.map((barco) =>
            this.barcoService.getTripulantesByBarcoId(barco.idBarco).pipe(
              map((tripRes) => {
                const asignado = (tripRes?.tripulantes ?? []).find((t: any) => {
                  const id = t?.idTripulante ?? t?.user_id;
                  return id === tripulanteId;
                });
                if (!asignado) {
                  return null;
                }
                return {
                  idBarco: barco.idBarco,
                  nombre: barco.nombre,
                  fecha: barco.fecha,
                  created_at: asignado?.created_at
                } as EnrolBarcoItem;
              }),
              catchError(() => of(null))
            )
          )
        ).pipe(
          map((items) => items.filter((item): item is EnrolBarcoItem => !!item))
        );
      })
    ).subscribe({
      next: (items) => {
        this.enroles = items;
        this.cargandoEnroles = false;
        if (!items.length) {
          this.enrolesMensaje = 'Sin enroles para este tripulante.';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoEnroles = false;
        this.enrolesMensaje = 'No se pudieron cargar los enroles.';
        this.cdr.detectChanges();
      }
    });
  }

  goToBarcoDetalle(enrol: EnrolBarcoItem) {
    if (!enrol?.idBarco) {
      return;
    }

    this.router.navigate(['/barco-detalle', enrol.idBarco], {
      state: {
        barco: {
          idBarco: enrol.idBarco,
          nombre: enrol.nombre ?? '',
          fecha: enrol.fecha ?? ''
        }
      }
    });
  }
}

interface DocumentoItem {
  id?: number | string;
  tipo: string;
  archivo_path: string;
  created_at?: string;
  fecha_caducidad?: string;
}

interface EnrolBarcoItem {
  idBarco: string;
  nombre?: string;
  fecha?: string;
  created_at?: string;
}

