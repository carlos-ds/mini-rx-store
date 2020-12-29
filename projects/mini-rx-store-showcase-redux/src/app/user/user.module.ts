import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../shared/shared.module';

import { LoginComponent } from './login.component';

import { reducer } from './state/user.reducer';
import { store } from 'mini-rx-store';

const userRoutes: Routes = [{ path: 'login', component: LoginComponent }];

@NgModule({
    imports: [SharedModule, RouterModule.forChild(userRoutes)],
    declarations: [LoginComponent],
})
export class UserModule {
    constructor() {
        store.feature('users', reducer);
    }
}
