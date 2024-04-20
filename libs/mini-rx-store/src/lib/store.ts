import { Observable } from 'rxjs';
import {
    addFeature,
    appState,
    configureStore as _configureStore,
    dispatch,
    effect,
} from './store-core';
import {
    Action,
    Reducer,
    FeatureConfig,
    StoreConfig,
    AppState,
    miniRxError,
} from '@mini-rx/common';

export abstract class Store {
    // Abstract class for Angular Dependency injection
    // mini-rx-store itself uses `Store` just as a type (return type of `configureStore`)
    abstract feature<StateType extends object>(
        featureKey: string,
        reducer: Reducer<StateType>,
        config?: FeatureConfig<StateType>
    ): void;
    abstract dispatch(action: Action): void;
    abstract select<R>(mapFn: (state: AppState) => R): Observable<R>;
    abstract effect(effect: Observable<any>): void;
}

let isStoreConfigured = false;

export function configureStore(config: StoreConfig<AppState>): Store | never {
    if (!isStoreConfigured) {
        _configureStore(config);
        isStoreConfigured = true;

        return {
            feature: addFeature,
            select: appState.select.bind(appState),
            dispatch,
            effect,
        };
    }
    miniRxError('`configureStore` was called multiple times.');
}
