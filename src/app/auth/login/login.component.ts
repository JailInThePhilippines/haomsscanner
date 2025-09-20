import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    if (this.authService.isAuthenticated()) {
      const role = this.authService.getCurrentUserRole();
      this.navigateByRole(role || 'superadmin');
    }
  }

  ngOnInit(): void {
    // No need for role change subscription anymore
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  get f() { return this.loginForm.controls; }

  navigateByRole(role: string): void {
    const dashboardPath = role === 'admin' ? '/admin/dashboard' : '/superadmin/dashboard';
    this.router.navigate([dashboardPath]);
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const email = this.f['email'].value;
    const password = this.f['password'].value;

    // Try both roles simultaneously
    const superAdminLogin = this.authService.loginAsSuperAdmin(email, password).pipe(
      catchError(error => of({ error: true, role: 'superadmin', message: error.message }))
    );

    const adminLogin = this.authService.loginAsAdmin(email, password).pipe(
      catchError(error => of({ error: true, role: 'admin', message: error.message }))
    );

    forkJoin([superAdminLogin, adminLogin]).subscribe({
      next: ([superAdminResult, adminResult]) => {
        this.loading = false;

        // Check if superadmin login was successful
        if (!this.hasError(superAdminResult)) {
          Swal.fire({
            icon: 'success',
            title: 'Login Successful!',
            text: 'Welcome Super Admin',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
          this.navigateByRole('superadmin');
          return;
        }

        // Check if admin login was successful
        if (!this.hasError(adminResult)) {
          Swal.fire({
            icon: 'success',
            title: 'Login Successful!',
            text: 'Welcome Admin',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
          this.navigateByRole('admin');
          return;
        }

        // Both failed
        this.error = 'Invalid credentials for both Super Admin and Admin roles';
        Swal.fire({
          icon: 'error',
          title: 'Login Failed!',
          text: this.error,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      },
      error: (error) => {
        this.loading = false;
        this.error = 'An unexpected error occurred';
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

  private hasError(result: any): boolean {
    return result && result.error === true;
  }
}