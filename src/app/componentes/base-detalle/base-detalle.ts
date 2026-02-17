import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { NavbarComponent } from '../navbar/navbar';
import { BaseService } from '../../services/base.service';
import { Base } from '../../models/base';

@Component({
  selector: 'app-base-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './base-detalle.html',
  styleUrl: './base-detalle.css',
})
export class BaseDetalleComponent implements OnInit, AfterViewInit, OnDestroy {
  baseNombre = 'Base';
  base: Base = this.emptyBase();
  mensaje = '';
  targetBaseId = '';
  creando = false;
  coordsTexto = 'Sin ubicacion seleccionada';

  private mapaUbicacion: L.Map | null = null;
  private markerUbicacion: L.Marker | null = null;

  constructor(
    private baseService: BaseService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const paramId = this.route.snapshot.paramMap.get('id');
    const stateBase = this.router.getCurrentNavigation()?.extras.state?.['base'] ?? history.state?.base;
    this.targetBaseId = paramId || stateBase?.idBase || '';
    this.creando = !this.targetBaseId;

    if (stateBase) {
      this.base = {
        ...this.emptyBase(),
        ...stateBase
      };
      this.normalizarCoordenadas();
      this.baseNombre = this.base.nombre || 'Base';
    } else if (this.targetBaseId) {
      this.cargarBasePorId(this.targetBaseId);
    }
  }

  ngAfterViewInit() {
    this.inicializarMapaUbicacion();
  }

  ngOnDestroy() {
    if (this.mapaUbicacion) {
      this.mapaUbicacion.remove();
      this.mapaUbicacion = null;
      this.markerUbicacion = null;
    }
  }

  save() {
    this.mensaje = '';
    if (!this.base.nombre?.trim()) {
      this.mensaje = 'El nombre es obligatorio.';
      return;
    }

    const action = this.creando
      ? this.baseService.create(this.base)
      : this.baseService.updateById(this.targetBaseId, this.base);

    action.subscribe({
      next: (res: any) => {
        this.showSuccess(this.creando ? 'Base creada.' : 'Datos guardados.');
        if (this.creando) {
          this.targetBaseId = res?.idBase || this.base.idBase;
          this.creando = false;
        }
      },
      error: (err) => {
        const backendMessage = err?.error?.error ? String(err.error.error) : '';
        this.showError(backendMessage || (this.creando
          ? 'No se pudo crear la base.'
          : 'No se pudieron guardar los datos.'));
      }
    });
  }

  aplicarCoordenadasManual() {
    this.base.lat = this.toCoordinate(this.base.lat);
    this.base.lng = this.toCoordinate(this.base.lng);
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

  private emptyBase(): Base {
    return {
      idBase: '',
      nombre: '',
      comunidad: '',
      provincia: '',
      direccion: '',
      lat: null,
      lng: null
    };
  }

  private cargarBasePorId(idBase: string) {
    this.baseService.getById(idBase).subscribe({
      next: (data) => {
        const profile = data?.base ?? data ?? {};
        this.base = {
          ...this.emptyBase(),
          ...profile
        };
        this.normalizarCoordenadas();
        this.baseNombre = this.base.nombre || 'Base';
        this.actualizarMarcadorDesdeModelo();
        this.cdr.detectChanges();
      },
      error: () => {
        this.showError('No se pudo cargar la base.');
      }
    });
  }

  private inicializarMapaUbicacion() {
    if (this.mapaUbicacion) {
      return;
    }

    const contenedor = document.getElementById('mapa-ubicacion-base');
    if (!contenedor) {
      return;
    }

    this.mapaUbicacion = L.map('mapa-ubicacion-base').setView([39, 12], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.mapaUbicacion);

    this.mapaUbicacion.on('click', (event: L.LeafletMouseEvent) => {
      const lat = Number(event.latlng.lat.toFixed(6));
      const lng = Number(event.latlng.lng.toFixed(6));
      this.base.lat = lat;
      this.base.lng = lng;
      this.actualizarMarcadorDesdeModelo();
      this.cdr.detectChanges();
    });

    this.actualizarMarcadorDesdeModelo();
  }

  private actualizarMarcadorDesdeModelo() {
    const lat = this.toCoordinate(this.base.lat);
    const lng = this.toCoordinate(this.base.lng);
    this.base.lat = lat;
    this.base.lng = lng;

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
    const raw = this.base as Base & {
      latitud?: number | string | null;
      longitud?: number | string | null;
      lon?: number | string | null;
    };
    this.base.lat = this.toCoordinate(raw.lat ?? raw.latitud);
    this.base.lng = this.toCoordinate(raw.lng ?? raw.longitud ?? raw.lon);
    this.actualizarTextoCoordenadas();
  }

  private actualizarTextoCoordenadas() {
    if (this.base.lat === null || this.base.lat === undefined
      || this.base.lng === null || this.base.lng === undefined) {
      this.coordsTexto = 'Sin ubicacion seleccionada';
      return;
    }
    this.coordsTexto = `Lat: ${this.base.lat}, Lng: ${this.base.lng}`;
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
