import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  imports: [CommonModule, ReactiveFormsModule],
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  returnUrl: string = '/home';
  userRole: 'superadmin' | 'admin' = 'superadmin';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      role: ['superadmin', Validators.required]
    });

    if (this.authService.isAuthenticated()) {
      const role = this.authService.getCurrentUserRole();
      this.navigateToHomePage(role || 'superadmin');
    }
  }

  ngOnInit(): void {
    const routeRole = this.route.snapshot.queryParams['role'];
    if (routeRole === 'admin') {
      this.userRole = 'admin';
      this.loginForm.get('role')?.setValue('admin');
      this.returnUrl = '/home';
    } else {
      this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
    }

    this.loginForm.get('role')?.valueChanges.subscribe(role => {
      this.userRole = role;
      this.returnUrl = role === 'admin' ? '/home' : '/home';
    });
  }

  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.submitted = true;

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const email = this.f['email'].value;
    const password = this.f['password'].value;
    const role = this.f['role'].value;

    this.authService.login(email, password, role)
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Login Successful!',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });

          this.navigateToHomePage(role);
        },
        error: error => {
          this.error = error.message || 'Invalid credentials';
          this.loading = false;

          Swal.fire({
            icon: 'error',
            title: 'Login Failed!',
            text: this.error,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
        }
      });
  }

  navigateToHomePage(role: string): void {
    const homePath = role === 'admin' ? '/home' : '/home';
    this.router.navigate([homePath]);
  }
}