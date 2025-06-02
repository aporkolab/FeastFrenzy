import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable form field wrapper component.
 * Provides consistent styling for labels, inputs, error messages, and hints.
 *
 * Usage:
 * ```html
 * <app-form-field
 *   label="Product Name"
 *   [required]="true"
 *   [errorMessage]="getFieldError('name')"
 *   [showError]="isFieldInvalid('name')"
 *   hint="Enter a unique product name">
 *   <input formControlName="name" class="form-control">
 * </app-form-field>
 * ```
 */
@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="form-field" [class.has-error]="showError" [class.has-success]="showSuccess">
      <!-- Label -->
      @if (label) {
        <label [for]="fieldId" class="form-label">
          {{ label }}
          @if (required) {
            <span class="required-indicator" aria-hidden="true">*</span>
            <span class="visually-hidden">(required)</span>
          }
        </label>
      }

      <!-- Input slot -->
      <div class="input-wrapper">
        <ng-content></ng-content>

        <!-- Success icon -->
        @if (showSuccess && !hideValidationIcons) {
          <span class="validation-icon success-icon" aria-hidden="true">
            ✓
          </span>
        }

        <!-- Error icon -->
        @if (showError && !hideValidationIcons) {
          <span class="validation-icon error-icon" aria-hidden="true">
            ✗
          </span>
        }
      </div>

      <!-- Error message -->
      @if (showError && errorMessage) {
        <div
          class="error-message"
          role="alert"
          aria-live="assertive"
          [id]="fieldId + '-error'">
          <span class="error-icon" aria-hidden="true">⚠</span>
          {{ errorMessage }}
        </div>
      }

      <!-- Hint text -->
      @if (hint && !showError) {
        <div
          class="hint-text"
          [id]="fieldId + '-hint'">
          {{ hint }}
        </div>
      }

      <!-- Character count -->
      @if (showCharCount && maxLength) {
        <div
          class="char-count"
          [class.warning]="currentLength > maxLength * 0.9"
          [class.error]="currentLength > maxLength">
          {{ currentLength }} / {{ maxLength }}
        </div>
      }
    </div>
  `,
  styles: [`
    .form-field {
      margin-bottom: 1rem;
    }

    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: var(--ff-label-color, #374151);
    }

    .required-indicator {
      color: var(--ff-error-color, #dc3545);
      margin-left: 0.25rem;
    }

    .input-wrapper {
      position: relative;
    }

    .validation-icon {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.875rem;
      pointer-events: none;
    }

    .success-icon {
      color: var(--ff-success-color, #198754);
    }

    .error-icon {
      color: var(--ff-error-color, #dc3545);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-top: 0.375rem;
      font-size: 0.875rem;
      color: var(--ff-error-color, #dc3545);
    }

    .error-message .error-icon {
      font-size: 0.75rem;
    }

    .hint-text {
      margin-top: 0.375rem;
      font-size: 0.875rem;
      color: var(--ff-hint-color, #6b7280);
    }

    .char-count {
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: var(--ff-hint-color, #6b7280);
      text-align: right;
    }

    .char-count.warning {
      color: var(--ff-warning-color, #f59e0b);
    }

    .char-count.error {
      color: var(--ff-error-color, #dc3545);
    }

    /* States */
    .has-error :host ::ng-deep input,
    .has-error :host ::ng-deep select,
    .has-error :host ::ng-deep textarea {
      border-color: var(--ff-error-color, #dc3545);
    }

    .has-success :host ::ng-deep input,
    .has-success :host ::ng-deep select,
    .has-success :host ::ng-deep textarea {
      border-color: var(--ff-success-color, #198754);
    }

    /* Accessibility */
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `]
})
export class FormFieldComponent {
  /** Field label text */
  @Input() label = '';

  /** Unique identifier for the field (used for label association) */
  @Input() fieldId = `field-${Math.random().toString(36).substr(2, 9)}`;

  /** Whether the field is required */
  @Input() required = false;

  /** Hint text shown below the input when there's no error */
  @Input() hint = '';

  /** Error message to display */
  @Input() errorMessage: string | null = '';

  /** Whether to show the error state */
  @Input() showError = false;

  /** Whether to show success state */
  @Input() showSuccess = false;

  /** Hide validation icons (checkmark/X) */
  @Input() hideValidationIcons = false;

  /** Show character count */
  @Input() showCharCount = false;

  /** Max length for character count */
  @Input() maxLength: number | null = null;

  /** Current length for character count */
  @Input() currentLength = 0;
}
