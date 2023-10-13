import { AppState, StoreConfig } from '@mini-rx/common';
import { configureStore, dispatch, selectableAppState } from './store-core';

export class Store {
    dispatch = dispatch;
    select = selectableAppState.select;

    constructor(config: StoreConfig<AppState>) {
        configureStore(config);
    }
}
