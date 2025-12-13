import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink]
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  get f() {
    return this.registerForm.controls;
  }

  
  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    
    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric;

    return passwordValid ? null : { passwordStrength: true };
  }

  
  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  
  getPasswordStrength(): { strength: number; label: string; class: string } {
    const password = this.f['password'].value || '';
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

  onSubmit(): void {
    if (this.registerForm.invalid) {
      
      Object.keys(this.f).forEach(key => {
        this.f[key].markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { name, email, password } = this.registerForm.value;

    this.authService.register({ name, email, password }).subscribe({
      next: () => {
        
        this.router.navigate(['/login'], {
          queryParams: { message: 'Registration successful! Please log in.' }
        });
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.message || 'Registration failed. Please try again.';
      }
    });
  }
}
