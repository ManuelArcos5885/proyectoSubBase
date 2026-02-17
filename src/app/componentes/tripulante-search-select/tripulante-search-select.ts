import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TripulanteResumen } from '../../services/tripulante.service';

@Component({
  selector: 'app-tripulante-search-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tripulante-search-select.html',
  styleUrl: './tripulante-search-select.css'
})
export class TripulanteSearchSelectComponent implements OnChanges {
  @Input() tripulantes: TripulanteResumen[] = [];
  @Input() selectedId = '';
  @Output() selectedIdChange = new EventEmitter<string>();

  query = '';
  showDropdown = false;
  filtered: TripulanteResumen[] = [];
  private lastSelectedId = '';

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tripulantes']) {
      this.applyFilter();
    }
    if (changes['selectedId']) {
      const selected = this.tripulantes.find((t) => t.user_id === this.selectedId);
      if (selected) {
        this.query = this.label(selected);
      } else if (!this.selectedId && this.lastSelectedId) {
        // Solo limpiamos cuando realmente se deselecciona desde fuera.
        this.query = '';
      }
      this.lastSelectedId = this.selectedId;
    }
  }

  onFocus() {
    this.showDropdown = true;
    this.applyFilter();
  }

  onBlur() {
    setTimeout(() => {
      this.showDropdown = false;
    }, 150);
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent) {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (!this.elementRef.nativeElement.contains(target)) {
      this.showDropdown = false;
    }
  }

  onQueryChange() {
    this.showDropdown = true;
    if (this.selectedId) {
      this.selectedId = '';
      this.selectedIdChange.emit('');
    }
    this.applyFilter();
  }

  select(item: TripulanteResumen) {
    this.selectedId = item.user_id;
    this.query = this.label(item);
    this.selectedIdChange.emit(item.user_id);
    this.showDropdown = false;
  }

  private applyFilter() {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      this.filtered = [...this.tripulantes];
      return;
    }

    this.filtered = this.tripulantes.filter((item) => {
      const id = String(item.user_id ?? '').toLowerCase();
      const nombre = String(item.nombre ?? '').toLowerCase();
      const apellidos = String(item.apellidos ?? '').toLowerCase();
      const fullName = `${nombre} ${apellidos}`.trim();
      return id.includes(q) || nombre.includes(q) || apellidos.includes(q) || fullName.includes(q);
    });
  }

  label(item: TripulanteResumen) {
    return `${item.apellidos} ${item.nombre} (${item.user_id})`.trim();
  }
}
