import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { Action, Actions, Reducer, StoreExtension } from '@mini-rx/common';
import { createRxEffect, ofType } from '@mini-rx/common';
import { FeatureStore } from '../feature-store';
import { Store } from '../store';
import { createComponentStore, globalCsConfig } from '../component-store';
import {
    MockImmutableStateExtension,
    MockLoggerExtension,
    MockUndoExtension,
} from './_spec-helpers';
import {
    provideComponentStoreConfig,
    provideEffects,
    provideFeature,
    provideStore,
} from '../providers';

const loadAction: Action = {
    type: 'LOAD',
};
const loadAction2: Action = {
    type: 'LOAD_2',
};
const loadAction3: Action = {
    type: 'LOAD_3',
};
const loadSuccessAction: Action = {
    type: 'LOAD_SUCCESS',
};
const loadSuccessAction2: Action = {
    type: 'LOAD_SUCCESS_2',
};
const loadSuccessAction3: Action = {
    type: 'LOAD_SUCCESS_3',
};
const loadFailAction: Action = {
    type: 'LOAD_FAIL',
};

interface CounterState {
    counter: number;
}

const counterInitialState: CounterState = {
    counter: 1,
};

function counterReducer(state: CounterState = counterInitialState, action: Action) {
    switch (action.type) {
        case 'counter':
            return {
                ...state,
                counter: state.counter + 1,
            };
        default:
            return state;
    }
}

const featureMetaReducerSpy = jest.fn();

function featureMetaReducer(reducer: Reducer<any>): Reducer<any> {
    return (state, action) => {
        featureMetaReducerSpy(state);
        return reducer(state, action);
    };
}

@Injectable()
class TodoEffects {
    loadTodos$ = createRxEffect(
        this.actions$.pipe(
            ofType(loadAction.type),
            mergeMap(() =>
                of('some result').pipe(
                    map((res) => loadSuccessAction),
                    catchError((err) => of(loadFailAction))
                )
            )
        )
    );

    nonDispatchingEffect$ = createRxEffect(
        this.actions$.pipe(
            ofType(loadAction2.type),
            mergeMap(() => of('some result').pipe(map((res) => loadSuccessAction2)))
        ),
        { dispatch: false }
    );

    constructor(private actions$: Actions) {}
}

@Injectable()
class TodoEffectsNOK {
    // Effect is not registered because it is not using createEffect!
    loadTodos$ = this.actions$.pipe(
        ofType(loadAction3.type),
        mergeMap(() => of('some result').pipe(map((res) => loadSuccessAction3)))
    );

    constructor(private actions$: Actions) {}
}

class CounterFeatureStore extends FeatureStore<CounterState> {
    constructor() {
        super('counterFs', counterInitialState);
    }

    inc() {
        this.update((state) => ({
            counter: state.counter + 1,
        }));
    }
}

const globalCsExtensions = [new MockLoggerExtension(), new MockImmutableStateExtension()];

describe(`Providers`, () => {
    let actions$: Actions;
    let store: Store;

    const rootMetaReducerSpy = jest.fn();

    function rootMetaReducer(reducer: Reducer<any>): Reducer<any> {
        return (state, action) => {
            rootMetaReducerSpy(state);
            return reducer(state, action);
        };
    }

    const extensionSpy = jest.fn();

    class SomeExtension extends StoreExtension {
        id = 1; // id does not matter, but it has to be implemented

        init(): void {
            extensionSpy();
        }
    }

    beforeAll(() => {
        TestBed.configureTestingModule({
            providers: [
                provideStore({
                    reducers: {
                        counter1: counterReducer,
                    },
                    initialState: {
                        counter1: { counter: 111 },
                    },
                    metaReducers: [rootMetaReducer],
                    extensions: [new SomeExtension()],
                }),
                provideEffects(TodoEffects, TodoEffectsNOK),
                provideFeature('counter2', counterReducer),
                provideFeature('counter3', counterReducer, {
                    initialState: {
                        counter: 555,
                    },
                    metaReducers: [featureMetaReducer],
                }),
                provideComponentStoreConfig({
                    extensions: globalCsExtensions,
                }),
            ],
        });

        actions$ = TestBed.inject(Actions);
        store = TestBed.inject(Store);
    });

    it(`should provide Store`, () => {
        expect(store).toBeTruthy();
    });

    it(`should initialize Store`, () => {
        const selectedState = store.select((state) => state);
        expect(selectedState()).toEqual({
            counter1: { counter: 111 }, // Reducer initial state is overwritten by initial state from forRoot config
            counter2: { counter: 1 },
            counter3: { counter: 555 }, // forFeature config initial state
        });

        expect(rootMetaReducerSpy).toHaveBeenCalledTimes(3);
        expect(featureMetaReducerSpy).toHaveBeenCalledTimes(1);
        expect(extensionSpy).toHaveBeenCalledTimes(1);
    });

    it(`should provide Actions`, () => {
        expect(actions$).toBeTruthy();
    });

    it(`should update state`, () => {
        store.dispatch({ type: 'counter' });
        const selectedState = store.select((state) => state);

        expect(selectedState()).toEqual({
            counter1: { counter: 112 },
            counter2: { counter: 2 },
            counter3: { counter: 556 },
        });

        expect(rootMetaReducerSpy).toHaveBeenCalledTimes(4);
        expect(featureMetaReducerSpy).toHaveBeenCalledTimes(2);
    });

    it(`should run effect`, () => {
        const spy = jest.fn();
        actions$.subscribe(spy);

        store.dispatch(loadAction);

        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenCalledWith(loadAction);
        expect(spy).toHaveBeenCalledWith(loadSuccessAction);
    });

    it(`should run non-dispatching effect`, () => {
        const spy = jest.fn();
        actions$.subscribe(spy);

        store.dispatch(loadAction2);

        expect(spy).toHaveBeenCalledWith(loadAction2);
        expect(spy).not.toHaveBeenCalledWith(loadSuccessAction);
    });

    it(`should NOT run effects from TodoEffectsNOK`, () => {
        const spy = jest.fn();
        actions$.subscribe(spy);

        store.dispatch(loadAction3);

        expect(spy).toHaveBeenCalledWith(loadAction3);
        expect(spy).not.toHaveBeenCalledWith(loadSuccessAction3);
    });

    describe(`FeatureStore`, () => {
        let fs: CounterFeatureStore;
        beforeAll(() => {
            fs = TestBed.runInInjectionContext(() => {
                return new CounterFeatureStore();
            });
        });

        it(`should add Feature Store`, () => {
            const selectedState = store.select((state) => state);

            expect(selectedState()).toEqual({
                counter1: { counter: 112 },
                counterFs: { counter: 1 },
                counter2: { counter: 2 },
                counter3: { counter: 556 },
            });
        });
    });

    describe(`ComponentStore`, () => {
        // Just make sure that the global config is set via provideComponentStoreConfig

        it('should set global component store config', () => {
            const globalExtensions = globalCsConfig.get()?.extensions ?? [];

            expect(globalExtensions[0]).toBe(globalCsExtensions[0]);
            expect(globalExtensions[1]).toBe(globalCsExtensions[1]);
        });
    });
});
