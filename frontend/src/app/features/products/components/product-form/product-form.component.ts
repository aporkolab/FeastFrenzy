import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Product, CreateProductDto, UpdateProductDto } from 'src/app/model/product';
import { BaseFormComponent, FormFieldComponent } from 'src/app/shared/components';
import { CustomValidators } from 'src/app/shared/validators';

/**
 * Reusable Product form component.
 * Handles both create and edit modes based on whether a product is provided.
 * 
 * Usage:
 * ```html
 * <app-product-form
 *   [product]="existingProduct"
 *   [loading]="isSaving"
 *   (save)="onSave($event)"
 *   (cancel)="onCancel()"
 * ></app-product-form>
 * ```
 */
@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent],
  template: `
    <form 
      [formGroup]="form" 
      (ngSubmit)="onFormSubmit()" 
      class="product-form" 
      novalidate
      aria-label="Product information form"
    >
      <!-- Name Field -->
      <app-form-field
        label="Product Name"
        fieldId="product-name"
        [required]="true"
        [showError]="isFieldInvalid('name')"
        [errorMessage]="getFieldError('name')"
        hint="Enter a descriptive product name (1-255 characters)">
        <input
          type="text"
          id="product-name"
          class="form-control"
          formControlName="name"
          [class.is-invalid]="isFieldInvalid('name')"
          [class.is-valid]="isFieldValid('name')"
          placeholder="e.g., Premium Coffee Blend"
          autocomplete="off"
          aria-required="true"
          [attr.aria-invalid]="isFieldInvalid('name')"
          [attr.aria-describedby]="isFieldInvalid('name') ? 'product-name-error' : 'product-name-hint'"
        >
      </app-form-field>

      <!-- Price Field -->
      <app-form-field
        label="Price"
        fieldId="product-price"
        [required]="true"
        [showError]="isFieldInvalid('price')"
        [errorMessage]="getFieldError('price')"
        hint="Enter price in your local currency (max 2 decimal places)">
        <div class="input-group">
          <span class="input-group-text" aria-hidden="true">$</span>
          <input
            type="number"
            id="product-price"
            class="form-control"
            formControlName="price"
            [class.is-invalid]="isFieldInvalid('price')"
            [class.is-valid]="isFieldValid('price')"
            placeholder="0.00"
            step="0.01"
            min="0"
            autocomplete="off"
            aria-required="true"
            aria-label="Product price in dollars"
            [attr.aria-invalid]="isFieldInvalid('price')"
            [attr.aria-describedby]="isFieldInvalid('price') ? 'product-price-error' : 'product-price-hint'"
          >
        </div>
      </app-form-field>

      <!-- Form Actions -->
      <div class="form-actions d-flex gap-2 mt-4" role="group" aria-label="Form actions">
        <button
          type="button"
          class="btn btn-outline-secondary"
          (click)="onCancelClick()"
          [disabled]="loading"
          aria-label="Cancel and go back">
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          [disabled]="loading || (form.invalid && form.touched)"
          [attr.aria-busy]="loading"
          [attr.aria-label]="isEditMode ? 'Update product' : 'Create product'">
          @if (loading) {
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            <span class="sr-only">{{ isEditMode ? 'Updating product...' : 'Creating product...' }}</span>
            {{ isEditMode ? 'Updating...' : 'Creating...' }}
          } @else {
            {{ isEditMode ? 'Update Product' : 'Create Product' }}
          }
        </button>
      </div>

      <!-- Debug info (remove in production) -->
      @if (showDebug) {
        <div class="mt-4 p-3 bg-light rounded small" aria-hidden="true">
          <strong>Form Debug:</strong><br>
          Valid: {{ form.valid }}<br>
          Dirty: {{ form.dirty }}<br>
          Touched: {{ form.touched }}<br>
          Value: {{ form.value | json }}
        </div>
      }
    </form>
  `,
  styles: [`
    .product-form {
      max-width: 500px;
    }

    .form-actions {
      padding-top: 1rem;
      border-top: 1px solid var(--bs-border-color);
    }

    :host ::ng-deep .input-group .form-control.is-invalid {
      border-top-right-radius: 0.375rem;
      border-bottom-right-radius: 0.375rem;
    }
  `]
})
export class ProductFormComponent extends BaseFormComponent implements OnInit, OnChanges {
  /** Product to edit (null for create mode) */
  @Input() product: Product | null = null;
  
  /** Loading state for submit button */
  @Input() loading = false;
  
  /** Show debug information (dev only) */
  @Input() showDebug = false;

  /** Emitted when form is submitted with valid data */
  @Output() save = new EventEmitter<CreateProductDto | UpdateProductDto>();
  
  /** Emitted when cancel is clicked */
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {
    super();
  }

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-initialize form when product changes (e.g., loaded from API)
    if (changes['product'] && !changes['product'].firstChange) {
      this.initForm();
    }
  }

  /**
   * Check if we're in edit mode (have an existing product)
   */
  get isEditMode(): boolean {
    return !!this.product?.id;
  }

  /**
   * Initialize the form with validators
   */
  private initForm(): void {
    this.form = this.fb.group({
      name: [
        this.product?.name || '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(255),
          CustomValidators.noWhitespace
        ]
      ],
      price: [
        this.product?.price ?? null,
        [
          Validators.required,
          CustomValidators.price
        ]
      ]
    });
  }

  /**
   * Handle form submission
   */
  onFormSubmit(): void {
    if (this.form.invalid) {
      this.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;
    
    // Trim string values and parse price
    const dto: CreateProductDto | UpdateProductDto = {
      name: formValue.name.trim(),
      price: parseFloat(formValue.price)
    };

    this.save.emit(dto);
  }

  /**
   * Handle cancel click
   */
  onCancelClick(): void {
    this.cancel.emit();
  }
}
