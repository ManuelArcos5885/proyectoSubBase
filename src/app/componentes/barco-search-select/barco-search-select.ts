import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BarcoResumen } from '../../services/barco.service';

@Component({
  selector: 'app-barco-search-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './barco-search-select.html',
  styleUrl: './barco-search-select.css'
})
export class BarcoSearchSelectComponent implements OnChanges {
  @Input() barcos: BarcoResumen[] = [];
  @Input() selectedId = '';
  @Output() selectedIdChange = new EventEmitter<string>();

  query = '';
  showDropdown = false;
  filtered: BarcoResumen[] = [];
  private lastSelectedId = '';

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['barcos']) {
      this.applyFilter();
    }
    if (changes['selectedId']) {
      const selected = this.barcos.find((b) => b.idBarco === this.selectedId);
      if (selected) {
        this.query = this.label(selected);
      } else if (!this.selectedId && this.lastSelectedId) {
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

  select(item: BarcoResumen) {
    this.selectedId = item.idBarco;
    this.query = this.label(item);
    this.selectedIdChange.emit(item.idBarco);
    this.showDropdown = false;
  }

  private applyFilter() {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      this.filtered = [...this.barcos];
      return;
    }

    this.filtered = this.barcos.filter((item) => {
      const id = String(item.idBarco ?? '').toLowerCase();
      const nombre = String(item.nombre ?? '').toLowerCase();
      return id.includes(q) || nombre.includes(q);
    });
  }

  label(item: BarcoResumen) {
    return `${item.nombre} (${item.idBarco})`.trim();
  }
}

