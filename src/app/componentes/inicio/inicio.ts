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

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.userService.getMe().subscribe({
      next: (res: any) => {
        const nombre = `${res?.profile?.nombre ?? ''} ${res?.profile?.apellidos ?? ''}`.trim();
        this.displayName = nombre;
        this.cdr.detectChanges();
      }
    });
  }
}
