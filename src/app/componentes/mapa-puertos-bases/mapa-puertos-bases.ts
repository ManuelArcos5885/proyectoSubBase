import { AfterViewInit, ChangeDetectorRef, Component, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import * as L from 'leaflet';
import { NavbarComponent } from '../navbar/navbar';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

interface PuntoMapa {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  tipo: 'puerto' | 'base';
  comunidad?: string;
  provincia?: string;
  direccion?: string;
}

interface BarcoEnPuerto {
  idBarco: string;
  nombre?: string;
  fecha?: string;
  created_at?: string;
}

interface PuertoDetalle {
  idPuerto: string;
  nombre: string;
  comunidad?: string;
  provincia?: string;
  direccion?: string;
  lat?: number | null;
  lng?: number | null;
}

@Component({
  selector: 'app-mapa-puertos-bases',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './mapa-puertos-bases.html',
  styleUrl: './mapa-puertos-bases.css',
})
export class MapaPuertosBasesComponent implements AfterViewInit, OnDestroy {
  puertosVisibles = false;
  basesVisibles = false;
  cargandoPuertos = false;
  cargandoBases = false;
  error = '';

  // Estado del modal de barcos en puerto.
  modalAbierto = false;
  modalTitulo = '';
  modalError = '';
  modalCargando = false;
  barcosModal: BarcoEnPuerto[] = [];
  puertoModal: PuntoMapa | null = null;

  private mapa: L.Map | null = null;
  private capaPuertos = L.layerGroup();
  private capaBases = L.layerGroup();
  private puertosCargados = false;
  private basesCargadas = false;
  private readonly endpointPuertos = [`${environment.apiUrl}/puertos`];
  private readonly endpointBases = [`${environment.apiUrl}/bases`];
  private readonly endpointBarcosPuertoPrefix = [`${environment.apiUrl}/puerto`];
  private readonly endpointPuertoDetallePrefix = [`${environment.apiUrl}/puerto`];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngAfterViewInit() {
    this.inicializarMapa();
  }

  ngOnDestroy() {
    if (this.mapa) {
      this.mapa.remove();
      this.mapa = null;
    }
  }

  async togglePuertos() {
    this.error = '';
    try {
      if (!this.puertosCargados) {
        this.cargandoPuertos = true;
        const puertos = await this.cargarPuntos(this.endpointPuertos, 'puerto');
        this.llenarCapa(this.capaPuertos, puertos);
        this.puertosCargados = true;
      }

      this.puertosVisibles = this.toggleCapa(this.capaPuertos, this.puertosVisibles);
    } catch {
      this.error = 'No se pudieron cargar los puertos.';
    } finally {
      this.cargandoPuertos = false;
    }
  }

  async toggleBases() {
    this.error = '';
    try {
      if (!this.basesCargadas) {
        this.cargandoBases = true;
        const bases = await this.cargarPuntos(this.endpointBases, 'base');
        this.llenarCapa(this.capaBases, bases);
        this.basesCargadas = true;
      }

      this.basesVisibles = this.toggleCapa(this.capaBases, this.basesVisibles);
    } catch {
      this.error = 'No se pudieron cargar las bases.';
    } finally {
      this.cargandoBases = false;
    }
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.puertoModal = null;
    this.cdr.detectChanges();
  }

  abrirBarcoEnNuevaPestana(barco: BarcoEnPuerto) {
    if (!barco?.idBarco) {
      return;
    }
    const url = this.router.serializeUrl(this.router.createUrlTree(['/barco-detalle', barco.idBarco]));
    window.open(url, '_blank');
  }

  private inicializarMapa() {
    // Centro inicial enfocado en sur de Europa y mar Mediterraneo.
    this.mapa = L.map('mapa-puertos-bases').setView([39, 12], 5);

    // Capa base de OpenStreetMap.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.mapa);

    // Ajusta el encuadre inicial al Mediterraneo y sur de Europa.
    const mediterraneoBounds = L.latLngBounds(
      L.latLng(30, -6),
      L.latLng(46, 37)
    );
    this.mapa.fitBounds(mediterraneoBounds);
  }

  private toggleCapa(capa: L.LayerGroup, visible: boolean) {
    if (!this.mapa) {
      return visible;
    }

    if (visible) {
      this.mapa.removeLayer(capa);
      return false;
    }

    this.mapa.addLayer(capa);
    return true;
  }

  private llenarCapa(capa: L.LayerGroup, puntos: PuntoMapa[]) {
    capa.clearLayers();

    for (const punto of puntos) {
      const marker = L.marker([punto.lat, punto.lng], {
        icon: this.crearIconoPorTipo(punto.tipo),
      });
      marker.bindPopup(punto.nombre);

      // Nombre visible siempre encima del marcador.
      marker.bindTooltip(punto.nombre, {
        permanent: true,
        direction: 'top',
        offset: [0, -14],
        className: 'marker-label',
      });

      const abrirModal = () => {
        if (punto.tipo === 'puerto') {
          // Leaflet dispara eventos fuera de Angular; entramos en zona para refrescar la UI al instante.
          this.ngZone.run(() => {
            void this.abrirModalBarcosPuerto(punto);
          });
        }
      };

      marker.on('click', abrirModal);
      // Fallback: algunos clicks abren popup sin propagar como esperas.
      marker.on('popupopen', abrirModal);

      marker.addTo(capa);
    }
  }

  private crearIconoPorTipo(tipo: 'puerto' | 'base'): L.DivIcon {
    const clase = tipo === 'puerto' ? 'marker-puerto' : 'marker-base';
    return L.divIcon({
      className: `marker-custom ${clase}`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8],
    });
  }

  private async abrirModalBarcosPuerto(punto: PuntoMapa) {
    this.modalAbierto = true;
    this.modalTitulo = `Barcos en ${punto.nombre}`;
    this.modalError = '';
    this.modalCargando = true;
    this.barcosModal = [];
    this.puertoModal = punto;
    this.cdr.detectChanges();

    try {
      const detalle = await this.cargarDetallePuerto(punto.id);
      if (detalle) {
        this.puertoModal = {
          ...punto,
          nombre: detalle.nombre || punto.nombre,
          comunidad: detalle.comunidad ?? punto.comunidad ?? '',
          provincia: detalle.provincia ?? punto.provincia ?? '',
          direccion: detalle.direccion ?? punto.direccion ?? '',
          lat: this.toNumber(detalle.lat) ?? punto.lat,
          lng: this.toNumber(detalle.lng) ?? punto.lng,
        };
      }
      this.barcosModal = await this.cargarBarcosDePuerto(punto.id);
    } catch {
      this.modalError = 'No se pudieron cargar los barcos de este puerto.';
      this.barcosModal = [];
    } finally {
      this.modalCargando = false;
      this.cdr.detectChanges();
    }
  }

  private async cargarDetallePuerto(idPuerto: string): Promise<PuertoDetalle | null> {
    let lastError: unknown = null;
    for (const prefix of this.endpointPuertoDetallePrefix) {
      const url = `${prefix}/${encodeURIComponent(idPuerto)}`;
      try {
        const res = await firstValueFrom(
          this.http.get<unknown>(url, { headers: this.authHeaders() })
        );
        const row = this.extraerObjeto(res, ['puerto', 'data', 'item']);
        if (!row) {
          return null;
        }
        const id = String(row['idPuerto'] ?? row['idpuerto'] ?? idPuerto);
        return {
          idPuerto: id,
          nombre: String(row['nombre'] ?? ''),
          comunidad: row['comunidad'] ? String(row['comunidad']) : '',
          provincia: row['provincia'] ? String(row['provincia']) : '',
          direccion: row['direccion'] ? String(row['direccion']) : '',
          lat: this.toNumber(row['lat'] ?? row['latitud']),
          lng: this.toNumber(row['lng'] ?? row['longitud'] ?? row['lon']),
        };
      } catch (err) {
        lastError = err;
      }
    }
    if (lastError) {
      return null;
    }
    return null;
  }

  private async cargarBarcosDePuerto(idPuerto: string): Promise<BarcoEnPuerto[]> {
    let lastError: unknown = null;
    for (const prefix of this.endpointBarcosPuertoPrefix) {
      const url = `${prefix}/${encodeURIComponent(idPuerto)}/barcos`;
      try {
        const res = await firstValueFrom(
          this.http.get<unknown>(url, { headers: this.authHeaders() })
        );
        const raw = this.extraerColeccion(res, ['barcos', 'data', 'items']);
        if (!raw) {
          return [];
        }
        return raw.map((item) => this.mapearBarco(item)).filter((b): b is BarcoEnPuerto => b !== null);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError ?? new Error('No se pudo consultar barcos.');
  }

  private mapearBarco(value: unknown): BarcoEnPuerto | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const row = value as Record<string, unknown>;
    const idBarco = String(row['idBarco'] ?? row['idbarco'] ?? '').trim();
    if (!idBarco) {
      return null;
    }
    return {
      idBarco,
      nombre: String(row['nombre'] ?? ''),
      fecha: row['fecha'] ? String(row['fecha']) : undefined,
      created_at: row['created_at'] ? String(row['created_at']) : undefined,
    };
  }

  private async cargarPuntos(urls: string[], tipo: 'puerto' | 'base'): Promise<PuntoMapa[]> {
    let lastError: unknown = null;
    let res: unknown = null;

    for (const url of urls) {
      try {
        res = await firstValueFrom(
          this.http.get<unknown>(url, { headers: this.authHeaders() })
        );
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (res === null && lastError) {
      throw lastError;
    }

    const raw =
      Array.isArray(res) ? res :
      this.extraerColeccion(res, ['puertos', 'bases', 'data', 'items']);

    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((item, idx) => this.mapearPunto(item, idx, tipo))
      .filter((item): item is PuntoMapa => item !== null);
  }

  private extraerColeccion(
    value: unknown,
    keys: string[]
  ): unknown[] | null {
    if (Array.isArray(value)) {
      return value;
    }
    if (!value || typeof value !== 'object') {
      return null;
    }

    const obj = value as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(obj[key])) {
        return obj[key] as unknown[];
      }
    }

    return null;
  }

  private extraerObjeto(
    value: unknown,
    keys: string[]
  ): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const obj = value as Record<string, unknown>;
    for (const key of keys) {
      const candidate = obj[key];
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        return candidate as Record<string, unknown>;
      }
    }
    return obj;
  }

  private mapearPunto(value: unknown, idx: number, tipo: 'puerto' | 'base'): PuntoMapa | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const row = value as Record<string, unknown>;
    const lat = this.toNumber(row['lat'] ?? row['latitud']);
    const lng = this.toNumber(row['lng'] ?? row['lon'] ?? row['longitud']);
    if (lat === null || lng === null) {
      return null;
    }

    return {
      id: String(row['id'] ?? row['idPuerto'] ?? row['idBase'] ?? idx),
      nombre: String(row['nombre'] ?? 'Sin nombre'),
      lat,
      lng,
      tipo,
      comunidad: row['comunidad'] ? String(row['comunidad']) : '',
      provincia: row['provincia'] ? String(row['provincia']) : '',
      direccion: row['direccion'] ? String(row['direccion']) : '',
    };
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private authHeaders() {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}
