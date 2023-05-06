import { ChangeDetectionStrategy, Component, Signal } from '@angular/core';
import { CounterStore } from '../state/counter-store.service';

@Component({
    selector: 'app-counter',
    templateUrl: './counter.component.html',
    styleUrls: ['./counter.component.css'],
    providers: [CounterStore], // The CounterStore is provided for each counter component instance
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterComponent {
    counter: Signal<number> = this.counterStore.count;

    constructor(private counterStore: CounterStore) {}

    increment() {
        this.counterStore.increment();
    }

    decrement() {
        this.counterStore.decrement();
    }
}
