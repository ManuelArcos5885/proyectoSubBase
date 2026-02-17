import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class InicioComponent implements OnInit {
  displayName = '';

  puertos = [
    {
      idPuerto: 'PRT-001',
      nombre: 'Puerto de A Coruna',
      comunidad: 'Galicia',
      provincia: 'A Coruna',
      direccion: 'Muelle de San Diego, A Coruna'
    },
    {
      idPuerto: 'PRT-014',
      nombre: 'Puerto de Vigo',
      comunidad: 'Galicia',
      provincia: 'Pontevedra',
      direccion: 'Muelle de Trasatlantic, Vigo'
    },
    {
      idPuerto: 'PRT-033',
      nombre: 'Puerto de Gijon',
      comunidad: 'Principado de Asturias',
      provincia: 'Asturias',
      direccion: 'El Musel, Gijon'
    }
  ];

  bases = [
    {
      idBase: 'BSE-102',
      nombre: 'Base Atlantica Norte',
      comunidad: 'Galicia',
      provincia: 'A Coruna',
      direccion: 'Av. del Puerto, Ferrol'
    },
    {
      idBase: 'BSE-208',
      nombre: 'Base Maritima Centro',
      comunidad: 'Cantabria',
      provincia: 'Cantabria',
      direccion: 'Calle de la Mar 12, Santander'
    }
  ];

  campanas = [
    {
      idCampana: 'CMP-301',
      nombre: 'Campana Costa Verde'
    },
    {
      idCampana: 'CMP-402',
      nombre: 'Campana Rias Baixas'
    }
  ];

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.userService.getMe().subscribe({
      next: (res: any) => {
        const nombre = `${res?.profile?.nombre ?? ''} ${res?.profile?.apellidos ?? ''}`.trim();
        this.displayName = nombre || res?.user?.email || '';
        this.cdr.detectChanges();
      }
    });
  }
}
