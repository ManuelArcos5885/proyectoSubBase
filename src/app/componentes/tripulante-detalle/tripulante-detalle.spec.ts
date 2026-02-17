import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripulanteDetalle } from './tripulante-detalle';

describe('TripulanteDetalle', () => {
  let component: TripulanteDetalle;
  let fixture: ComponentFixture<TripulanteDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripulanteDetalle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripulanteDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
