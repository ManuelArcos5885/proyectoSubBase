import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { NavbarComponent } from '../navbar/navbar';
import { PuertoService } from '../../services/puerto.service';
import { Puerto } from '../../models/puerto';
import { BarcoService, BarcoResumen } from '../../services/barco.service';
import { BarcoSearchSelectComponent } from '../barco-search-select/barco-search-select';

@Component({
  selector: 'app-puerto-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, BarcoSearchSelectComponent],
  templateUrl: './puerto-detalle.html',
  styleUrl: './puerto-detalle.css',
})
export class PuertoDetalleComponent implements OnInit, AfterViewInit, OnDestroy {
  activeTab: 'datos' | 'barcos' = 'datos';
  puertoNombre = 'Puerto';
  puerto: Puerto = this.emptyPuerto();
  mensaje = '';
  barcosMensaje = '';
  barcos: BarcoPuertoItem[] = [];
  barcosDisponibles: BarcoResumen[] = [];
  todosBarcos: BarcoResumen[] = [];
  selectedBarcoId = '';
  cargandoBarcos = false;
  targetPuertoId = '';
  creando = false;
  coordsTexto = 'Sin ubicacion seleccionada';

  private mapaUbicacion: L.Map | null = null;
  private markerUbicacion: L.Marker | null = null;

  constructor(
    private puertoService: PuertoService,
    private barcoService: BarcoService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const paramId = this.route.snapshot.paramMap.get('id');
    const statePuerto = this.router.getCurrentNavigation()?.extras.state?.['puerto'] ?? history.state?.puerto;
    this.targetPuertoId = paramId || statePuerto?.idPuerto || '';
    this.creando = !this.targetPuertoId;

    if (statePuerto) {
      this.puerto = {
        ...this.emptyPuerto(),
        ...statePuerto
      };
      this.normalizarCoordenadas();
      this.puertoNombre = this.puerto.nombre || 'Puerto';
    } else if (this.targetPuertoId) {
      this.cargarPuertoPorId(this.targetPuertoId);
    }
  }

  ngAfterViewInit() {
    this.inicializarMapaUbicacion();
  }

  ngOnDestroy() {
    this.destruirMapaUbicacion();
  }

  setTab(tab: 'datos' | 'barcos') {
    this.activeTab = tab;
    if (tab === 'datos') {
      setTimeout(() => this.inicializarMapaUbicacion());
    } else {
      this.destruirMapaUbicacion();
    }

    if (tab === 'barcos' && !this.cargandoBarcos && this.targetPuertoId) {
      setTimeout(() => {
        this.cargarBarcosPorPuerto(this.targetPuertoId);
        this.cargarBarcosDisponibles();
      });
    }
  }

  save() {
    this.mensaje = '';
    if (!this.puerto.nombre?.trim()) {
      this.mensaje = 'El nombre es obligatorio.';
      return;
    }

    const action = this.creando
      ? this.puertoService.create(this.puerto)
      : this.puertoService.updateById(this.targetPuertoId, this.puerto);

    action.subscribe({
      next: (res: any) => {
        this.showSuccess(this.creando ? 'Puerto creado.' : 'Datos guardados.');
        if (this.creando) {
          this.targetPuertoId = res?.idPuerto || this.puerto.idPuerto;
          this.creando = false;
        }
      },
      error: (err) => {
        const backendMessage = err?.error?.error ? String(err.error.error) : '';
        this.showError(backendMessage || (this.creando
          ? 'No se pudo crear el puerto.'
          : 'No se pudieron guardar los datos.'));
      }
    });
  }

  aplicarCoordenadasManual() {
    this.puerto.lat = this.toCoordinate(this.puerto.lat);
    this.puerto.lng = this.toCoordinate(this.puerto.lng);
    this.actualizarMarcadorDesdeModelo();
  }

  private showSuccess(text: string) {
    this.mensaje = text;
    this.cdr.detectChanges();
  }

  private showError(text: string) {
    this.mensaje = text;
    this.cdr.detectChanges();
  }

  private emptyPuerto(): Puerto {
    return {
      idPuerto: '',
      nombre: '',
      comunidad: '',
      provincia: '',
      direccion: '',
      lat: null,
      lng: null
    };
  }

  private cargarPuertoPorId(idPuerto: string) {
    this.puertoService.getById(idPuerto).subscribe({
      next: (data) => {
        const profile = data?.puerto ?? data ?? {};
        this.puerto = {
          ...this.emptyPuerto(),
          ...profile
        };
        this.normalizarCoordenadas();
        this.puertoNombre = this.puerto.nombre || 'Puerto';
        this.actualizarMarcadorDesdeModelo();
        this.cdr.detectChanges();
      },
      error: () => {
        this.showError('No se pudo cargar el puerto.');
      }
    });
  }

  agregarBarco() {
    this.barcosMensaje = '';
    if (!this.targetPuertoId) {
      this.barcosMensaje = 'No se pudo identificar el puerto.';
      return;
    }
    if (!this.selectedBarcoId) {
      this.barcosMensaje = 'Selecciona un barco.';
      return;
    }

    this.puertoService.addBarcoToPuerto(this.targetPuertoId, {
      idBarco: this.selectedBarcoId
    }).subscribe({
      next: () => {
        this.barcosMensaje = 'Barco agregado.';
        this.selectedBarcoId = '';
        this.cargarBarcosPorPuerto(this.targetPuertoId);
        this.cargarBarcosDisponibles();
      },
      error: () => {
        this.barcosMensaje = 'No se pudo agregar el barco.';
      }
    });
  }

  quitarBarco(item: BarcoPuertoItem) {
    if (!this.targetPuertoId) {
      this.barcosMensaje = 'No se pudo identificar el puerto.';
      return;
    }
    const nombre = item.nombre || item.idBarco;
    if (!confirm(`Quitar ${nombre} del puerto?`)) {
      return;
    }

    this.puertoService.removeBarcoFromPuerto(this.targetPuertoId, item.idBarco).subscribe({
      next: () => {
        this.barcosMensaje = 'Barco quitado.';
        this.cargarBarcosPorPuerto(this.targetPuertoId);
        this.cargarBarcosDisponibles();
      },
      error: () => {
        this.barcosMensaje = 'No se pudo quitar el barco.';
      }
    });
  }

  goToBarcoDetalle(item: BarcoPuertoItem) {
    if (!item?.idBarco) {
      return;
    }
    this.router.navigate(['/barco-detalle', item.idBarco], {
      state: {
        barco: {
          idBarco: item.idBarco,
          nombre: item.nombre ?? '',
          fecha: item.fecha ?? ''
        }
      }
    });
  }

  private cargarBarcosPorPuerto(idPuerto: string) {
    this.cargandoBarcos = true;
    this.puertoService.getBarcosByPuertoId(idPuerto).subscribe({
      next: (res) => {
        this.barcos = res?.barcos ?? [];
        this.cargandoBarcos = false;
        this.actualizarDisponibles();
        this.cdr.detectChanges();
      },
      error: () => {
        this.barcosMensaje = 'No se pudieron cargar los barcos del puerto.';
        this.cargandoBarcos = false;
        this.cdr.detectChanges();
      }
    });
  }

  private cargarBarcosDisponibles() {
    this.barcoService.getBarcos().subscribe({
      next: (res) => {
        this.todosBarcos = res?.barcos ?? [];
        this.actualizarDisponibles();
        this.cdr.detectChanges();
      },
      error: () => {
        this.barcosMensaje = 'No se pudo cargar el listado de barcos.';
        this.cdr.detectChanges();
      }
    });
  }

  private actualizarDisponibles() {
    const asignados = new Set(this.barcos.map((b) => String(b.idBarco)));
    this.barcosDisponibles = (this.todosBarcos ?? []).filter((b) => !asignados.has(String(b.idBarco)));
  }

  private inicializarMapaUbicacion() {
    if (this.activeTab !== 'datos' || this.mapaUbicacion) {
      return;
    }

    const contenedor = document.getElementById('mapa-ubicacion-puerto');
    if (!contenedor) {
      return;
    }

    this.mapaUbicacion = L.map('mapa-ubicacion-puerto').setView([39, 12], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.mapaUbicacion);

    this.mapaUbicacion.on('click', (event: L.LeafletMouseEvent) => {
      const lat = Number(event.latlng.lat.toFixed(6));
      const lng = Number(event.latlng.lng.toFixed(6));
      this.puerto.lat = lat;
      this.puerto.lng = lng;
      this.actualizarMarcadorDesdeModelo();
      this.cdr.detectChanges();
    });

    this.actualizarMarcadorDesdeModelo();
  }

  private destruirMapaUbicacion() {
    if (this.mapaUbicacion) {
      this.mapaUbicacion.remove();
      this.mapaUbicacion = null;
      this.markerUbicacion = null;
    }
  }

  private actualizarMarcadorDesdeModelo() {
    const lat = this.toCoordinate(this.puerto.lat);
    const lng = this.toCoordinate(this.puerto.lng);
    this.puerto.lat = lat;
    this.puerto.lng = lng;

    if (!this.mapaUbicacion) {
      this.actualizarTextoCoordenadas();
      return;
    }

    if (lat === null || lng === null) {
      if (this.markerUbicacion) {
        this.mapaUbicacion.removeLayer(this.markerUbicacion);
        this.markerUbicacion = null;
      }
      this.actualizarTextoCoordenadas();
      return;
    }

    const punto: L.LatLngExpression = [lat, lng];
    if (!this.markerUbicacion) {
      this.markerUbicacion = L.marker(punto).addTo(this.mapaUbicacion);
    } else {
      this.markerUbicacion.setLatLng(punto);
    }

    this.mapaUbicacion.setView(punto, 7);
    this.actualizarTextoCoordenadas();
  }

  private normalizarCoordenadas() {
    const raw = this.puerto as Puerto & {
      latitud?: number | string | null;
      longitud?: number | string | null;
      lon?: number | string | null;
    };
    this.puerto.lat = this.toCoordinate(raw.lat ?? raw.latitud);
    this.puerto.lng = this.toCoordinate(raw.lng ?? raw.longitud ?? raw.lon);
    this.actualizarTextoCoordenadas();
  }

  private actualizarTextoCoordenadas() {
    if (this.puerto.lat === null || this.puerto.lat === undefined
      || this.puerto.lng === null || this.puerto.lng === undefined) {
      this.coordsTexto = 'Sin ubicacion seleccionada';
      return;
    }
    this.coordsTexto = `Lat: ${this.puerto.lat}, Lng: ${this.puerto.lng}`;
  }

  private toCoordinate(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Number(value.toFixed(6));
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Number(parsed.toFixed(6)) : null;
    }
    return null;
  }
}

interface BarcoPuertoItem {
  idBarco: string;
  nombre?: string;
  fecha?: string;
  created_at?: string;
}
