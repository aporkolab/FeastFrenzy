import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../service/auth.service';
import { BaseFormComponent, FormFieldComponent } from 'src/app/shared/components';
import { ToastService } from 'src/app/shared/services';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormFieldComponent]
})
export class LoginComponent extends BaseFormComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  returnUrl = '/dashboard';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {
    super();
  }

  get isEditMode(): boolean {
    return false; // Login is never edit mode
  }

  ngOnInit(): void {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.initForm();

    // Get return URL from query params
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    // Show message if redirected from registration or session expiry
    const message = this.route.snapshot.queryParams['message'];
    if (message) {
      this.successMessage = message;
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { email, password } = this.form.value;

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.toastService.success('Welcome back!');
        this.router.navigate([this.returnUrl]);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Login failed. Please try again.';
      }
    });
  }
}
