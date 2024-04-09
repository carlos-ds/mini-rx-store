import { Action, StateOrCallback, createMiniRxActionType, OperationType } from '@mini-rx/common';

export const enum SetStateActionType {
    FEATURE_STORE = '@mini-rx/feature-store',
    COMPONENT_STORE = '@mini-rx/component-store',
}

export interface FeatureStoreSetStateAction<T> {
    setStateActionType: SetStateActionType.FEATURE_STORE; // Used for type predicate `isFeatureStoreSetStateAction`
    stateOrCallback: StateOrCallback<T>; // Used in feature reducer to calc new state
    type: string; // The action type visible in DevTools / Logging Extension (really only for logging!)
    featureId: string; // Links the feature reducer to its corresponding FeatureStore
    featureKey: string; // Used in Redux DevTools / Logging Extension to calculate the action payload (see `beautifyActionForLogging`)
}

export interface ComponentStoreSetStateAction<T> {
    setStateActionType: SetStateActionType.COMPONENT_STORE; // Used for type predicate `isComponentStoreSetStateAction`
    stateOrCallback: StateOrCallback<T>; // Used in component store reducer to calc new state
    type: string; // The action type visible in DevTools / Logging Extension (really only for logging!)
}

export function createMiniRxAction(
    miniRxActionType: OperationType.INIT | OperationType.DESTROY,
    featureKey?: string
): Action {
    return {
        type: createMiniRxActionType(miniRxActionType, featureKey),
    };
}
