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

@Component({
  selector: 'app-tripulante-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, LoadingOverlayComponent],
  templateUrl: './tripulante-detalle.html',
  styleUrl: './tripulante-detalle.css',
})
export class TripulanteDetalleComponent implements OnInit {
  activeTab: 'datos' | 'documentos' | 'enroles' = 'datos';
  tripulanteNombre = 'Mi ficha';
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
  enroles: EnrolBarcoItem[] = [];
  cargandoEnroles = false;
  enrolesMensaje = '';

  constructor(
    private auth: AuthService,
    private tripulanteService: TripulanteService,
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
      return;
    }

    this.cargarFicha();
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
    if (!this.fechaCaducidad) {
      this.documentoMensaje = 'Selecciona la fecha de caducidad.';
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
          fecha_caducidad: this.fechaCaducidad
        })
      : this.tripulanteService.createDocumento({
          tipo: this.documentoTipo,
          archivo_path: path,
          fecha_caducidad: this.fechaCaducidad
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

  fileNameFromPath(path: string) {
    const parts = path.split('/');
    return parts[parts.length - 1] || 'documento.pdf';
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

