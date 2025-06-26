# FeastFrenzy Bug Fixes - 2025-01-XX

## 🔴 KRITIKUS HIBÁK

### 1. Backend - Purchases Schema Mismatch
**Hiba:** `Unknown column 'purchases.date' in 'field list'` + `500 OK` hibák

**Oka:** A `purchases` model és a migration eltérő oszlopneveket használ:

| Model (kód)     | Migration (DB)    | Típus eltérés |
|-----------------|-------------------|---------------|
| `date`          | `purchaseDate`    | ✓ Átnevezés |
| `total`         | `totalAmount`     | ✓ Átnevezés |
| `closed` (bool) | `status` (ENUM)   | ✓ Konverzió |
| timestamps:false| createdAt/updatedAt| - |

**Fix:** `20250818000000-fix-purchases-schema.js` migration
- Átnevezi az oszlopokat a model szerint
- Konvertálja az ENUM-ot BOOLEAN-ra

### 2. Backend - Products/PurchaseItems Schema Mismatch
**Oka:** A modelek nem tartalmazzák a DB-ben létező oszlopokat

**Products:**
- Model: `name`, `price` (timestamps: false)
- DB: + `description`, `category`, `availability`, `createdAt`, `updatedAt`

**PurchaseItems:**
- Model: `id`, `quantity`, `purchaseId`, `productId` (timestamps: false)
- DB: + `unitPrice`, `totalPrice`, `createdAt`, `updatedAt`

**Fix:** `20250819000000-cleanup-schema-mismatch.js` migration
- Eltávolítja a használatlan oszlopokat a DB-ből

---

## 🟡 FRONTEND HIBÁK

### 3. Employee törlés - nincs értesítés
**Hiba:** "A user törlés működik, de nem küld róla értesítést és nem frissít rá."

**Oka:** `ToastService` nem volt inject-elve a component-ben

**Fix:** `employees.component.ts`
```typescript
constructor(
  private employeeService: EmployeeService,
  private toastService: ToastService  // HOZZÁADVA
) {}

// deleteEmployee-ben:
this.toastService.success(`Employee "${employee.name}" deleted successfully!`);
```

### 4. Products törlés - nincs értesítés
**Hiba:** Ugyanaz mint employee

**Oka:** `ToastService` importálva volt, de nem inject-elve

**Fix:** `products.component.ts`
```typescript
constructor(
  private productService: ProductService,
  private toastService: ToastService  // HOZZÁADVA
) {}
```

---

## 🟠 POTENCIÁLIS PROBLÉMÁK

### 5. Edit Employee spinner
**Hiba:** "edit employee ablak csak teker, spinningel, rá kell frissíteni"

**Lehetséges okok:**
1. Backend lassú (retry mechanizmus)
2. API válasz nem jön meg időben
3. NgOnChanges nem trigger-elődik

**Javasolt debug:**
- Ellenőrizd a network tab-ot - jön-e válasz?
- Nézd meg a backend logokat
- A migration lefutása után teszteld újra

### 6. Products lekérés lassú
**Hiba:** "kurva lassú a lekérés 50-100 elemnél"

**Lehetséges okok:**
1. Hiányzó indexek
2. N+1 query probléma
3. Cache nem működik

**Javasolt fix:**
- Futtasd le az `analyze-queries.js` script-et
- Ellenőrizd a DB indexeket

---

## 📋 DEPLOYMENT CHECKLIST

```bash
# 1. Backup DB
mysqldump -u USER -p feastfrenzy > backup_$(date +%Y%m%d).sql

# 2. Futtasd a migration-öket
cd backend
npx sequelize-cli db:migrate

# 3. Ellenőrizd a séma állapotát
npx sequelize-cli db:migrate:status

# 4. Restart backend
pm2 restart feastfrenzy-backend

# 5. Tesztelj!
curl -X GET https://feastfrenzy.dev/api/v1/health
curl -X GET https://feastfrenzy.dev/api/v1/purchases
curl -X GET https://feastfrenzy.dev/api/v1/products
```

---

## 🎯 PRIORITÁSOK

1. **MOST:** Futtasd a migration-öket a szerveren
2. **MOST:** Deployold a frontend fix-eket
3. **UTÁNA:** Teszteld az edit employee funkciót
4. **UTÁNA:** Mérd a lekérési időket

---

Készítette: Claude + Ádám
