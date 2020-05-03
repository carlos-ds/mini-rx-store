import Store, { actions$ } from './store';
import StoreCore from './store-core';
import { Action, Settings } from './interfaces';
import { createFeatureSelector, createSelector } from './selector';
import { EMPTY, Observable, of } from 'rxjs';
import { ofType } from './utils';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { ReduxDevtoolsExtension } from './redux-devtools/redux-devtools.extension';
import { cold, hot } from 'jest-marbles';

const asyncUser: Partial<UserState> = {
    firstName: 'Steven',
    lastName: 'Seagal',
    age: 30
};

const updatedAsyncUser: Partial<UserState> = {
    firstName: 'Steven',
    lastName: 'Seagal',
    age: 31
};

function fakeApiGet(): Observable<UserState> {
    return cold('---a', {a: asyncUser});
}

function fakeApiUpdate(): Observable<UserState> {
    return cold('-a', {a: updatedAsyncUser});
}

function fakeApiWithError(): Observable<UserState> {
    return cold('-#');
}

function reducer(state: UserState, action: Action): UserState {
    switch (action.type) {
        case 'updateUser':
        case 'loadUserSuccess':
        case 'saveUserSuccess':
            return {
                ...state,
                ...action.payload,
            };
        case 'resetUser':
            return initialState;
        case 'incAge':
            return {
                ...state,
                age: state.age + 1
            };
        case 'error':
            return {
                ...state,
                err: action.payload
            };
        default:
            return state;
    }
}

interface UserState {
    firstName: string;
    lastName: string;
    age: number;
    err: string;
}

const initialState: UserState = {
    firstName: 'Bruce',
    lastName: 'Willis',
    age: 30,
    err: undefined
};

const getUser = createFeatureSelector<UserState>('user');
const getFirstName = createSelector(getUser, user => user.firstName);
const getAge = createSelector(getUser, user => user.age);

describe('Store', () => {
    it('should initialize the store with an empty object', () => {
        const spy = jest.fn();
        Store.select((state) => state).subscribe(spy);
        expect(spy).toHaveBeenCalledWith({});
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should initialize a Feature state', () => {
        Store.feature<UserState>('user', initialState, reducer);

        const spy = jest.fn();
        Store.select((state) => state).subscribe(spy);
        expect(spy).toHaveBeenCalledWith({
            user: initialState,
        });
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should throw when reusing feature name', () => {
        expect(() =>
            Store.feature<UserState>('user', initialState, reducer)
        ).toThrowError();
    });

    it('should update the Feature state', () => {
        const user = {
            firstName: 'Nicolas',
            lastName: 'Cage',
        };

        Store.dispatch({
            type: 'updateUser',
            payload: user,
        });

        const spy = jest.fn();
        Store.select(getFirstName).subscribe(spy);
        expect(spy).toHaveBeenCalledWith('Nicolas');
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should update the Feature state #1', () => {
        const age$ = Store.select(getAge);
        hot('-a-b').subscribe(
            value => Store.dispatch({type: 'incAge'})
        );
        expect(age$).toBeObservable(hot('ab-c', {a: 30, b: 31, c: 32}));
    });

    it('should update the Feature state #2', () => {
        const age$ = Store.select(getAge);
        hot('(ab)').subscribe(
            value => Store.dispatch({type: 'incAge'})
        );
        expect(age$).toBeObservable(hot('(abc)', {a: 32, b: 33, c: 34}));
    });

    it('should create and execute an effect', () => {
        Store.dispatch({type: 'resetUser'});

        Store.createEffect(
            actions$.pipe(
                ofType('loadUser'),
                mergeMap(() =>
                    fakeApiGet().pipe(
                        map((user) => ({
                            type: 'loadUserSuccess',
                            payload: user,
                        })),
                        catchError((err) => EMPTY)
                    )
                )
            )
        );

        Store.dispatch({ type: 'loadUser' });

        // Lets be crazy and add another effect while the other effect is busy
        cold('-a').subscribe(() => {
            Store.createEffect(
                actions$.pipe(
                    ofType('saveUser'),
                    mergeMap(() =>
                        fakeApiUpdate().pipe(
                            map((user) => ({
                                type: 'saveUserSuccess',
                                payload: user,
                            })),
                            catchError((err) => EMPTY)
                        )
                    )
                )
            );

            Store.dispatch({type: 'saveUser'});
        });

        expect(Store.select(getUser)).toBeObservable(hot('a-xb', {a: initialState, b: asyncUser, x: updatedAsyncUser}));
    });

    it('should create and execute an effect and handle side effect error', () => {
        Store.dispatch({type: 'resetUser'});

        Store.createEffect(
            actions$.pipe(
                ofType('someAction'),
                mergeMap(() =>
                    fakeApiWithError().pipe(
                        map((user) => ({
                            type: 'whatever'
                        })),
                        catchError((err) => of({type: 'error', payload: 'error'}))
                    )
                )
            )
        );

        Store.dispatch({type: 'someAction'});

        expect(Store.select(getUser)).toBeObservable(hot('ab', {a: initialState, b: {...initialState, err: 'error'}}));
    });

    it('should set the settings', () => {
        const settings: Settings = { enableLogging: true };
        Store.settings = settings;
        expect(StoreCore.settings).toEqual(settings);
    });

    it('should warn if settings are set again', () => {
        console.warn = jest.fn();

        const settings: Settings = { enableLogging: true };
        Store.settings = settings;
        expect(console.warn).toHaveBeenCalledWith(
            'MiniRx: Settings are already set.'
        );
    });

    it('should log', () => {
        console.log = jest.fn();

        const user: UserState = {
            firstName: 'John',
            lastName: 'Travolta',
            age: 35,
            err: undefined
        };

        const newState = {
            user,
        };

        const settings: Settings = { enableLogging: true };
        Store.settings = settings;
        expect(StoreCore.settings).toEqual(settings);

        Store.dispatch({
            type: 'updateUser',
            payload: user,
        });

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining('ACTION'),
            expect.anything(),
            expect.stringContaining('Type'),
            expect.stringContaining('updateUser'),
            expect.stringContaining('Payload'),
            user,
            expect.stringContaining('State'),
            newState
        );
    });

    it('should add extension', () => {
        const spy = jest.spyOn(StoreCore, 'addExtension');
        Store.addExtension(new ReduxDevtoolsExtension({}));
        expect(spy).toHaveBeenCalledTimes(1);
        expect(StoreCore['extensions'].length).toBe(1);
    });
});
