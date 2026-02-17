import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-overlay.html',
  styleUrl: './loading-overlay.css'
})
export class LoadingOverlayComponent {
  @Input() show = false;
  @Input() fullscreen = false;
  @Input() text = 'Cargando...';
}

