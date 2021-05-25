// Credits go to NgRx
// Copied from NgRx with small modifications:
// https://github.com/ngrx/platform/blob/12.0.0/modules/store/src/utils.ts

// The MIT License (MIT)
//
// Copyright (c) 2017 Brandon Roberts, Mike Ryan, Victor Savkin, Rob Wormald
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Action, Reducer, ReducerDictionary } from 'mini-rx-store';
import { AppState } from './models';

export function combineReducers(reducers: ReducerDictionary): Reducer<AppState> {
    const reducerKeys = Object.keys(reducers);
    const reducerKeyLength = reducerKeys.length;

    return (state: AppState = {}, action: Action): AppState => {
        const stateKeysLength = Object.keys(state).length;

        let hasChanged = stateKeysLength !== reducerKeyLength;
        const nextState: AppState = {};

        for (let i = 0; i < reducerKeyLength; i++) {
            const key = reducerKeys[i];
            const reducer: any = reducers[key];
            const previousStateForKey = state[key];
            const nextStateForKey = reducer(previousStateForKey, action);

            nextState[key] = nextStateForKey;
            hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
        }
        return hasChanged ? nextState : state;
    };
}
