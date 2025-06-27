# FeastFrenzy Changelog

## v1.2.0 - Industrial Standard UI & Performance

### Frontend - Modal-Based CRUD

#### Products Component
**Files:**
- `frontend/src/app/page/products/products.component.ts`
- `frontend/src/app/page/products/products.component.html`

**Changes:**
- Converted inline navigation to modal-based create/edit
- Added real-time filtering with 300ms debounce (name, min/max price)
- Added sortable table columns (ID, Name, Price)
- Added empty state with filter awareness
- Fixed filter type to handle HTML input empty strings

#### Employees Component
**Files:**
- `frontend/src/app/page/employees/employees.component.ts`
- `frontend/src/app/page/employees/employees.component.html`

**Changes:**
- Converted to modal-based create/edit operations
- Added real-time filtering with 300ms debounce (name, employee number)
- Added sortable table columns (ID, Name, Employee #, Monthly Limit)
- Added empty state with filter awareness
- Monthly consumption summary card preserved

#### Purchases Component
**Files:**
- `frontend/src/app/page/purchases/purchases.component.ts`
- `frontend/src/app/page/purchases/purchases.component.html`

**Changes:**
- Removed confusing inline form at bottom of table
- Edit button now navigates to `/purchases/:id/edit` (full detail page)
- Added View button for `/purchases/:id`
- Add Purchase button navigates to `/purchases/new`
- Cleaner UX for complex entity with purchase items

---

### Frontend - Performance Improvements

#### Employee Report Component - Backend Aggregation Optimization
**Files:**
- `backend/services/purchase.service.js` - Added `getAllEmployeeSummaries()` method
- `backend/controller/purchase/router.js` - Added `/summaries` endpoint
- `frontend/src/app/service/purchase.service.ts` - Added `getEmployeeSummaries()` method
- `frontend/src/app/model/purchase.ts` - Added `EmployeeSummary` interface
- `frontend/src/app/page/employee-report/employee-report.component.ts`

**Problem:** Report was extremely slow (3+ seconds per element), especially when switching months.
The frontend was fetching 1000 purchases and calculating sums in JavaScript.

**Solution:** Moved aggregation to SQL backend with GROUP BY:
- New endpoint: `GET /api/v1/purchases/summaries?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Returns pre-aggregated `{employeeId, totalSpending, purchaseCount}` per employee
- Single SQL query with GROUP BY instead of N+1 queries
- Frontend now receives only summary data (a few KB instead of hundreds of KB)

**Performance improvement:** From 3+ seconds to ~100ms for month changes.

**Additional fixes:**
- Changed `Map<Employee, number>` to `Map<number, number>` using employee ID as key
- Eliminated O(n²) lookup in template with O(1) Map.get by ID
- Added 300ms debounce on month/year filter changes
- Fixed timezone issue in date formatting (toISOString → manual formatting)

#### Bulk Price Update - N+1 Fix
**File:** `backend/services/product.service.js` - `bulkUpdatePrices()` method

**Problem:** Loop made individual `findByPk()` and `update()` queries for each product.
Updating 100 products = 200 database queries.

**Fix:** Replaced loop with batch SQL CASE statement:
```sql
UPDATE products SET price = CASE id WHEN 1 THEN 10.99 WHEN 2 THEN 15.99 ... END WHERE id IN (1,2,...)
```
Result: 2 queries total (1 UPDATE + 1 SELECT for results) regardless of update count.

#### Loading Service (Previous Fix)
**File:** `frontend/src/app/shared/services/loading.service.ts`

**Problem:** Spinner never disappeared despite API returning 200.

**Fix:** Removed problematic `debounceTime` and `distinctUntilChanged` operators from loading observable.

#### Filter Subjects (Previous Fix)
**Files:** Multiple component files

**Problem:** `distinctUntilChanged()` on `Subject<void>` caused only first filter change to work.

**Fix:** Removed `distinctUntilChanged()` from filter pipelines - void emissions are always identical.

---

### Shared Components

#### Modal Component
**File:** `frontend/src/app/shared/components/modal/modal.component.ts`

**Features:**
- Reusable modal dialog for CRUD operations
- Size variants: sm, md, lg, xl
- ESC key to close
- Backdrop click to close (configurable)
- Loading state support
- Accessible with ARIA attributes

---

### UI/UX Improvements

- Consistent "Add" button placement in page headers
- Empty states now show contextual messages based on active filters
- Sort indicators on table headers (↑/↓/↕)
- Keyboard navigation support for sortable columns
- Filter clear button disabled when no filters active

---

## v1.1.0 - Bug Fixes & Enterprise Soft Delete

### Backend Fixes

#### 1. Table Name Mismatch (CRITICAL)
**File:** `backend/model/purchaseItems.js`

MySQL on Linux is case-sensitive. Migration created `purchase_items` but model used `purchaseItems`.

**Fix:** Added explicit `tableName: 'purchase_items'` in model options.

---

#### 2. Enterprise Soft Delete for Employees
**Files:**
- `backend/model/employees.js`
- `backend/services/employee.service.js`
- `backend/controller/employee/router.js`
- `backend/migrations/20250817000000-add-employee-soft-delete.js`

**Problem:** DELETE failed with "Cannot delete employee with existing purchases" - FK constraint blocked deletion.

**Solution:** Sequelize paranoid mode (soft delete):
- `deletedAt` timestamp instead of physical deletion
- Employees automatically filtered from normal queries
- Purchase history preserved for audit trail
- Restore functionality for admins

**New API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees/deleted` | List soft-deleted employees |
| POST | `/api/employees/:id/restore` | Restore a deleted employee |
| DELETE | `/api/employees/:id/hard-delete` | Permanently delete (no purchases only) |
| DELETE | `/api/employees/:id` | Soft delete (default) |

---

#### 3. Purchases Model - Include Deleted Employees
**File:** `backend/model/purchases.js`

**Change:** Added `paranoid: false` to employee includes in scopes so purchases display the (deleted) employee's info.

---

#### 4. Dockerignore Files (bcrypt crash fix)
**Files:**
- `backend/.dockerignore`
- `frontend/.dockerignore`

**Problem:** Host-compiled `node_modules` copied into Alpine container caused native module crashes (bcrypt).

**Fix:** Exclude `node_modules` from Docker build context.

---

### Frontend Fixes

#### 1. Missing Edit Routes (404 errors)
**Files:**
- `frontend/src/app/features/employees/employees.routes.ts`
- `frontend/src/app/features/products/products.routes.ts`
- `frontend/src/app/features/purchases/purchases.routes.ts`

**Problem:** Edit buttons linked to `/:id/edit` but only `/:id` route existed.

**Fix:** Added `:id/edit` route before `:id` in each feature module.

---

#### 2. Spinner Stuck on Navigation (Detail pages)
**Files:**
- `frontend/src/app/page/employee-detail/employee-detail.component.ts`
- `frontend/src/app/page/product-detail/product-detail.component.ts`

**Problem:** `route.snapshot.paramMap` is non-reactive. Navigation between details (e.g., employee 1 → 2) didn't trigger reload.

**Fix:** Changed to reactive `route.paramMap.pipe().subscribe()` pattern with proper state reset.

---

#### 3. Purchase Edit Creates Instead of Updates
**Files:**
- `frontend/src/app/page/purchases/purchases.component.ts`
- `frontend/src/app/page/purchases/purchases.component.html`
- `frontend/src/app/model/purchase.ts`

**Problem:** Form `(ngSubmit)` always called `createPurchase()` regardless of edit mode.

**Fix:**
- Added `submitForm()` method to route create/update based on `editingPurchase` state
- Added `updatePurchase()` method
- Added `employeeId` to `UpdatePurchaseDto` interface

---

## Deployment

```bash
# 1. Run migration for soft delete columns
docker exec -it feastfrenzy-backend npx sequelize-cli db:migrate

# 2. Rebuild containers
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@feastfrenzy.com | Admin123! |
| Manager | manager@feastfrenzy.com | Manager123! |
| Employee | employee@feastfrenzy.com | Employee123! |
