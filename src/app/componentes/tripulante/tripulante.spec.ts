import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tripulante } from './tripulante';

describe('Tripulante', () => {
  let component: Tripulante;
  let fixture: ComponentFixture<Tripulante>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tripulante]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tripulante);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
