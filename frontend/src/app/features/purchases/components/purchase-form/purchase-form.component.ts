import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Purchase, CreatePurchaseDto } from 'src/app/model/purchase';
import { PurchaseItem } from 'src/app/model/purchase-item';
import { Employee } from 'src/app/model/employee';
import { Product } from 'src/app/model/product';
import { EmployeeService } from 'src/app/service/employee.service';
import { ProductService } from 'src/app/service/product.service';
import { BaseFormComponent, FormFieldComponent } from 'src/app/shared/components';
import { CustomValidators } from 'src/app/shared/validators';

/**
 * Purchase item interface for the form (before it has an ID)
 */
interface PurchaseItemFormValue {
  productId: number | null;
  quantity: number | null;
  price: number | null;
}

/**
 * Extended DTO that includes items for creation
 */
export interface CreatePurchaseWithItemsDto extends CreatePurchaseDto {
  items?: PurchaseItemFormValue[];
}

/**
 * Purchase form component with FormArray for nested items.
 * This is senior-level Angular - nested reactive forms with dynamic arrays.
 * 
 * Features:
 * - Employee dropdown (async loaded)
 * - Date picker with validation
 * - Closed status checkbox
 * - Dynamic item list (FormArray)
 * - Auto-calculated total
 * - Product dropdown per item with price auto-fill
 */
@Component({
  selector: 'app-purchase-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="onFormSubmit()" class="purchase-form" novalidate aria-label="Purchase information form">
      
      <!-- Employee Selection -->
      <app-form-field
        label="Employee"
        fieldId="purchase-employee"
        [required]="true"
        [showError]="isFieldInvalid('employeeId')"
        [errorMessage]="getFieldError('employeeId')">
        <select
          id="purchase-employee"
          class="form-select"
          formControlName="employeeId"
          [class.is-invalid]="isFieldInvalid('employeeId')"
          [class.is-valid]="isFieldValid('employeeId')"
          aria-required="true"
          [attr.aria-invalid]="isFieldInvalid('employeeId')"
          aria-describedby="employee-status">
          <option [ngValue]="null" disabled>Select an employee...</option>
          @for (employee of employees; track employee.id) {
            <option [ngValue]="employee.id">
              {{ employee.name }} ({{ employee.employee_number }})
            </option>
          }
        </select>
        @if (employeesLoading) {
          <small id="employee-status" class="text-muted" aria-live="polite">Loading employees...</small>
        }
      </app-form-field>

      <!-- Purchase Date -->
      <app-form-field
        label="Date"
        fieldId="purchase-date"
        [required]="true"
        [showError]="isFieldInvalid('date')"
        [errorMessage]="getFieldError('date')"
        hint="Date of the purchase">
        <input
          type="date"
          id="purchase-date"
          class="form-control"
          formControlName="date"
          [class.is-invalid]="isFieldInvalid('date')"
          [class.is-valid]="isFieldValid('date')"
          aria-required="true"
          [attr.aria-invalid]="isFieldInvalid('date')"
        >
      </app-form-field>

      <!-- Closed Status -->
      <div class="form-check mb-3">
        <input
          type="checkbox"
          class="form-check-input"
          id="purchase-closed"
          formControlName="closed"
          aria-describedby="closed-help"
        >
        <label class="form-check-label" for="purchase-closed">
          Mark as closed (finalized)
        </label>
        <small id="closed-help" class="d-block text-muted">
          Closed purchases cannot be modified
        </small>
      </div>

      <hr class="my-4">

      <!-- Purchase Items Section -->
      <section class="items-section" aria-labelledby="items-heading">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2 id="items-heading" class="h5 mb-0">Purchase Items</h2>
          <button 
            type="button" 
            class="btn btn-outline-primary btn-sm"
            (click)="addItem()"
            [disabled]="form.get('closed')?.value"
            aria-label="Add a new item to this purchase">
            + Add Item
          </button>
        </div>

        @if (itemsArray.length === 0) {
          <div class="alert alert-info" role="status">
            No items added yet. Click "Add Item" to add products to this purchase.
          </div>
        }

        <!-- Items FormArray -->
        <div formArrayName="items" role="list" aria-label="Purchase items list">
          @for (item of itemsArray.controls; track i; let i = $index) {
            <div class="item-row card mb-2" [formGroupName]="i" role="listitem">
              <div class="card-body py-2">
                <div class="row g-2 align-items-end">
                  
                  <!-- Product Selection -->
                  <div class="col-md-4">
                    <label class="form-label small mb-1" [for]="'product-' + i">Product</label>
                    <select
                      [id]="'product-' + i"
                      class="form-select form-select-sm"
                      formControlName="productId"
                      [class.is-invalid]="isItemFieldInvalid(i, 'productId')"
                      (change)="onProductChange(i)"
                      aria-required="true"
                      [attr.aria-invalid]="isItemFieldInvalid(i, 'productId')">
                      <option [ngValue]="null" disabled>Select product...</option>
                      @for (product of products; track product.id) {
                        <option [ngValue]="product.id">
                          {{ product.name }} - {{ product.price | currency }}
                        </option>
                      }
                    </select>
                    @if (isItemFieldInvalid(i, 'productId')) {
                      <div class="invalid-feedback d-block small" role="alert">
                        Product is required
                      </div>
                    }
                  </div>

                  <!-- Quantity -->
                  <div class="col-md-2">
                    <label class="form-label small mb-1" [for]="'quantity-' + i">Qty</label>
                    <input
                      type="number"
                      [id]="'quantity-' + i"
                      class="form-control form-control-sm"
                      formControlName="quantity"
                      [class.is-invalid]="isItemFieldInvalid(i, 'quantity')"
                      min="1"
                      (input)="recalculateTotal()"
                      aria-required="true"
                      [attr.aria-invalid]="isItemFieldInvalid(i, 'quantity')"
                    >
                    @if (isItemFieldInvalid(i, 'quantity')) {
                      <div class="invalid-feedback d-block small" role="alert">
                        Min 1
                      </div>
                    }
                  </div>

                  <!-- Unit Price (readonly - from product) -->
                  <div class="col-md-2">
                    <label class="form-label small mb-1" [for]="'price-' + i">Price</label>
                    <div class="input-group input-group-sm">
                      <span class="input-group-text" aria-hidden="true">$</span>
                      <input
                        type="number"
                        [id]="'price-' + i"
                        class="form-control bg-light"
                        formControlName="price"
                        step="0.01"
                        readonly
                        aria-label="Unit price in dollars (from product)"
                        title="Price is set automatically from the selected product"
                      >
                    </div>
                  </div>

                  <!-- Line Total (calculated) -->
                  <div class="col-md-2">
                    <label class="form-label small mb-1" aria-hidden="true">Total</label>
                    <div class="form-control-plaintext fw-bold text-success" [attr.aria-label]="'Line total: ' + (getLineTotal(i) | currency)">
                      {{ getLineTotal(i) | currency }}
                    </div>
                  </div>

                  <!-- Remove Button -->
                  <div class="col-md-2 text-end">
                    <button 
                      type="button" 
                      class="btn btn-outline-danger btn-sm"
                      (click)="removeItem(i)"
                      [disabled]="form.get('closed')?.value"
                      [attr.aria-label]="'Remove item ' + (i + 1) + ' from purchase'">
                      <span aria-hidden="true">✕</span> Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Grand Total -->
        @if (itemsArray.length > 0) {
          <div class="d-flex justify-content-end mt-3">
            <div class="bg-light p-3 rounded" aria-live="polite">
              <span class="text-muted me-2">Grand Total:</span>
              <span class="fs-4 fw-bold text-success">{{ calculatedTotal | currency }}</span>
            </div>
          </div>
        }
      </section>

      <hr class="my-4">

      <!-- Form Actions -->
      <div class="form-actions d-flex gap-2" role="group" aria-label="Form actions">
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
          [attr.aria-label]="isEditMode ? 'Update purchase' : 'Create purchase'">
          @if (loading) {
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            <span class="sr-only">{{ isEditMode ? 'Updating purchase...' : 'Creating purchase...' }}</span>
            {{ isEditMode ? 'Updating...' : 'Creating...' }}
          } @else {
            {{ isEditMode ? 'Update Purchase' : 'Create Purchase' }}
          }
        </button>
      </div>

      <!-- Debug info -->
      @if (showDebug) {
        <div class="mt-4 p-3 bg-light rounded small" aria-hidden="true">
          <strong>Form Debug:</strong><br>
          Valid: {{ form.valid }} | Dirty: {{ form.dirty }}<br>
          Items: {{ itemsArray.length }}<br>
          Total: {{ calculatedTotal }}<br>
          Value: <pre class="mb-0">{{ form.value | json }}</pre>
        </div>
      }
    </form>
  `,
  styles: [`
    .purchase-form {
      max-width: 800px;
    }

    .items-section {
      background: var(--bs-gray-50, #f8f9fa);
      padding: 1rem;
      border-radius: 0.5rem;
    }

    .item-row {
      border: 1px solid var(--bs-border-color);
      background: white;
    }

    .item-row:hover {
      border-color: var(--bs-primary);
    }

    .form-actions {
      padding-top: 1rem;
      border-top: 1px solid var(--bs-border-color);
    }
  `]
})
export class PurchaseFormComponent extends BaseFormComponent implements OnInit, OnChanges, OnDestroy {
  /** Purchase to edit (null for create mode) */
  @Input() purchase: Purchase | null = null;
  
  /** Loading state for submit button */
  @Input() loading = false;
  
  /** Show debug information */
  @Input() showDebug = false;

  /** Emitted when form is submitted */
  @Output() save = new EventEmitter<CreatePurchaseWithItemsDto>();
  
  /** Emitted when cancel is clicked */
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;
  
  // Dropdown data
  employees: Employee[] = [];
  products: Product[] = [];
  employeesLoading = false;
  productsLoading = false;

  // Calculated total
  calculatedTotal = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private productService: ProductService
  ) {
    super();
  }

  ngOnInit(): void {
    this.initForm();
    this.loadDropdownData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['purchase'] && !changes['purchase'].firstChange) {
      this.initForm();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isEditMode(): boolean {
    return !!this.purchase?.id;
  }

  /**
   * Get the items FormArray
   */
  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  /**
   * Initialize the form
   */
  private initForm(): void {
    const today = new Date().toISOString().split('T')[0];
    
    this.form = this.fb.group({
      employeeId: [
        this.purchase?.employeeId || null,
        [Validators.required]
      ],
      date: [
        this.purchase?.date?.split('T')[0] || today,
        [Validators.required]
      ],
      closed: [
        this.purchase?.closed || false
      ],
      items: this.fb.array([])
    });

    // Initialize items from existing purchase
    if (this.purchase?.purchaseItems?.length) {
      this.purchase.purchaseItems.forEach(item => this.addItem(item));
    }

    // Recalculate total after init
    this.recalculateTotal();

    // Disable form if purchase is closed
    if (this.purchase?.closed) {
      this.form.disable();
    }
  }

  /**
   * Load employees and products for dropdowns
   */
  private loadDropdownData(): void {
    this.employeesLoading = true;
    this.employeeService.getAllEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employees) => {
          this.employees = employees;
          this.employeesLoading = false;
        },
        error: () => {
          this.employeesLoading = false;
        }
      });

    this.productsLoading = true;
    this.productService.getAllProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.products = products;
          this.productsLoading = false;
        },
        error: () => {
          this.productsLoading = false;
        }
      });
  }

  /**
   * Create a new item FormGroup
   * For existing items, price comes from item.product.price
   */
  private createItemGroup(item?: PurchaseItem): FormGroup {
    // Get price from product if item exists and has product loaded
    const price = item?.product?.price ?? null;
    return this.fb.group({
      productId: [item?.productId || null, [Validators.required]],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]],
      price: [price, [Validators.required, CustomValidators.price]]
    });
  }

  /**
   * Add a new item to the FormArray
   */
  addItem(item?: PurchaseItem): void {
    this.itemsArray.push(this.createItemGroup(item));
    this.recalculateTotal();
  }

  /**
   * Remove an item from the FormArray
   */
  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
    this.recalculateTotal();
  }

  /**
   * Handle product selection - auto-fill price from product
   */
  onProductChange(index: number): void {
    const itemGroup = this.itemsArray.at(index) as FormGroup;
    const productId = itemGroup.get('productId')?.value;
    
    if (productId) {
      const product = this.products.find(p => p.id === productId);
      if (product) {
        itemGroup.patchValue({ price: product.price });
        this.recalculateTotal();
      }
    }
  }

  /**
   * Calculate line total for an item
   */
  getLineTotal(index: number): number {
    const itemGroup = this.itemsArray.at(index) as FormGroup;
    const quantity = itemGroup.get('quantity')?.value || 0;
    const price = itemGroup.get('price')?.value || 0;
    return quantity * price;
  }

  /**
   * Recalculate the grand total
   */
  recalculateTotal(): void {
    this.calculatedTotal = this.itemsArray.controls.reduce((sum, control, index) => {
      return sum + this.getLineTotal(index);
    }, 0);
  }

  /**
   * Check if an item field is invalid
   */
  isItemFieldInvalid(itemIndex: number, fieldName: string): boolean {
    const itemGroup = this.itemsArray.at(itemIndex) as FormGroup;
    const field = itemGroup.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  /**
   * Handle form submission
   */
  onFormSubmit(): void {
    if (this.form.invalid) {
      this.markAllAsTouched();
      // Also mark all item fields as touched
      this.itemsArray.controls.forEach((group) => {
        Object.values((group as FormGroup).controls).forEach(control => {
          control.markAsTouched();
        });
      });
      return;
    }

    const formValue = this.form.getRawValue();

    // Build items array (used for both create and edit)
    const items = formValue.items.map((item: PurchaseItemFormValue) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price // Included for display/calculation, backend ignores this
    }));

    if (this.isEditMode) {
      // Update - include items so backend can replace them
      const updateDto: CreatePurchaseWithItemsDto = {
        employeeId: this.purchase!.employeeId, // Keep original employeeId
        date: formValue.date,
        closed: formValue.closed,
        total: this.calculatedTotal,
        items: items
      };
      this.save.emit(updateDto);
    } else {
      // Create - include items
      const createDto: CreatePurchaseWithItemsDto = {
        employeeId: formValue.employeeId,
        date: formValue.date,
        closed: formValue.closed,
        total: this.calculatedTotal,
        items: items
      };
      this.save.emit(createDto);
    }
  }

  /**
   * Handle cancel click
   */
  onCancelClick(): void {
    this.cancel.emit();
  }
}
