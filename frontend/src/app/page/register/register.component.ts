import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../service/auth.service';
import { BaseFormComponent, FormFieldComponent } from 'src/app/shared/components';
import { CustomValidators } from 'src/app/shared/validators';
import { ToastService } from 'src/app/shared/services';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormFieldComponent]
})
export class RegisterComponent extends BaseFormComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    super();
  }

  get isEditMode(): boolean {
    return false; // Registration is never edit mode
  }

  ngOnInit(): void {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.initForm();
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', [
        Validators.required, 
        Validators.minLength(2), 
        Validators.maxLength(100),
        CustomValidators.noWhitespace
      ]],
      email: ['', [
        Validators.required, 
        Validators.email
      ]],
      password: ['', [
        Validators.required, 
        CustomValidators.password // Uses our custom validator with proper feedback
      ]],
      confirmPassword: ['', [
        Validators.required, 
        CustomValidators.matchField('password')
      ]]
    });
  }

  /**
   * Calculate password strength for visual indicator
   */
  getPasswordStrength(): { strength: number; label: string; class: string } {
    const password = this.form.get('password')?.value || '';
    let strength = 0;
    let label = 'Weak';
    let cssClass = 'bg-danger';

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) {
      label = 'Weak';
      cssClass = 'bg-danger';
    } else if (strength <= 4) {
      label = 'Medium';
      cssClass = 'bg-warning';
    } else {
      label = 'Strong';
      cssClass = 'bg-success';
    }

    return { strength: Math.min(strength * 16.67, 100), label, class: cssClass };
  }

  /**
   * Get password requirements status for display
   */
  getPasswordRequirements(): { label: string; met: boolean }[] {
    const password = this.form.get('password')?.value || '';
    return [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'At least one lowercase letter', met: /[a-z]/.test(password) },
      { label: 'At least one number', met: /[0-9]/.test(password) }
    ];
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { name, email, password } = this.form.value;

    this.authService.register({ name, email, password }).subscribe({
      next: () => {
        this.toastService.success('Registration successful! Please log in.');
        this.router.navigate(['/login'], {
          queryParams: { message: 'Registration successful! Please log in.' }
        });
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Registration failed. Please try again.';
      }
    });
  }
}
