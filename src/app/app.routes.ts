import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
    { path: 'auth/login', component: LoginComponent },
    { path: 'home', component: HomeComponent, canActivate: [authGuard] },

    { path: '**', component: LoginComponent }
];