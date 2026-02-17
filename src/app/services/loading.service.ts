import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private pending = new BehaviorSubject<number>(0);
  readonly loading$ = this.pending.asObservable().pipe(map((count) => count > 0));

  show() {
    this.pending.next(this.pending.value + 1);
  }

  hide() {
    const next = this.pending.value - 1;
    this.pending.next(next < 0 ? 0 : next);
  }
}

