'use strict';

const bcrypt = require('bcrypt');

/**
 * CONSOLIDATED SEEDER - Matches the simplified schema
 *
 * Tables populated:
 * - employees (id, name, employee_number, monthlyConsumptionValue, deletedAt)
 * - users (full schema with roles)
 * - products (id, name, price ONLY)
 * - purchases (id, employeeId, userId, date, total, closed)
 * - purchase_items (id, purchaseId, productId, quantity ONLY)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    const now = new Date();

    try {
      // ============================================
      // EMPLOYEES - 20 Hungarian Names
      // ============================================
      const employees = [
        { id: 1, name: 'Kovács Péter', employee_number: 'EMP001', monthlyConsumptionValue: 25000, createdAt: now, updatedAt: now },
        { id: 2, name: 'Nagy Erzsébet', employee_number: 'EMP002', monthlyConsumptionValue: 20000, createdAt: now, updatedAt: now },
        { id: 3, name: 'Szabó András', employee_number: 'EMP003', monthlyConsumptionValue: 30000, createdAt: now, updatedAt: now },
        { id: 4, name: 'Tóth Katalin', employee_number: 'EMP004', monthlyConsumptionValue: 22000, createdAt: now, updatedAt: now },
        { id: 5, name: 'Horváth István', employee_number: 'EMP005', monthlyConsumptionValue: 28000, createdAt: now, updatedAt: now },
        { id: 6, name: 'Kiss Zsuzsanna', employee_number: 'EMP006', monthlyConsumptionValue: 18000, createdAt: now, updatedAt: now },
        { id: 7, name: 'Molnár Gábor', employee_number: 'EMP007', monthlyConsumptionValue: 35000, createdAt: now, updatedAt: now },
        { id: 8, name: 'Varga Mária', employee_number: 'EMP008', monthlyConsumptionValue: 21000, createdAt: now, updatedAt: now },
        { id: 9, name: 'Balogh László', employee_number: 'EMP009', monthlyConsumptionValue: 27000, createdAt: now, updatedAt: now },
        { id: 10, name: 'Fekete Anna', employee_number: 'EMP010', monthlyConsumptionValue: 23000, createdAt: now, updatedAt: now },
        { id: 11, name: 'Lakatos Tamás', employee_number: 'EMP011', monthlyConsumptionValue: 31000, createdAt: now, updatedAt: now },
        { id: 12, name: 'Oláh Judit', employee_number: 'EMP012', monthlyConsumptionValue: 19000, createdAt: now, updatedAt: now },
        { id: 13, name: 'Simon Béla', employee_number: 'EMP013', monthlyConsumptionValue: 26000, createdAt: now, updatedAt: now },
        { id: 14, name: 'Farkas Éva', employee_number: 'EMP014', monthlyConsumptionValue: 24000, createdAt: now, updatedAt: now },
        { id: 15, name: 'Németh Zoltán', employee_number: 'EMP015', monthlyConsumptionValue: 29000, createdAt: now, updatedAt: now },
        { id: 16, name: 'Papp Ildikó', employee_number: 'EMP016', monthlyConsumptionValue: 20000, createdAt: now, updatedAt: now },
        { id: 17, name: 'Takács Ferenc', employee_number: 'EMP017', monthlyConsumptionValue: 32000, createdAt: now, updatedAt: now },
        { id: 18, name: 'Juhász Klára', employee_number: 'EMP018', monthlyConsumptionValue: 17000, createdAt: now, updatedAt: now },
        { id: 19, name: 'Szűcs Attila', employee_number: 'EMP019', monthlyConsumptionValue: 25000, createdAt: now, updatedAt: now },
        { id: 20, name: 'Budai Szilvia', employee_number: 'EMP020', monthlyConsumptionValue: 22000, createdAt: now, updatedAt: now },
      ];

      await queryInterface.bulkInsert('employees', employees, { transaction });

      // ============================================
      // USERS - Demo accounts
      // ============================================
      const saltRounds = 10;
      const users = [
        {
          id: 1,
          email: 'admin@feastfrenzy.com',
          password: await bcrypt.hash('Admin123!', saltRounds),
          name: 'Admin User',
          role: 'admin',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 2,
          email: 'manager@feastfrenzy.com',
          password: await bcrypt.hash('Manager123!', saltRounds),
          name: 'Manager User',
          role: 'manager',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 3,
          email: 'employee@feastfrenzy.com',
          password: await bcrypt.hash('Employee123!', saltRounds),
          name: 'Employee User',
          role: 'employee',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      await queryInterface.bulkInsert('users', users, { transaction });

      // ============================================
      // PRODUCTS - 65 Hungarian Canteen Foods (SIMPLIFIED: id, name, price only)
      // ============================================
      const products = [
        // LEVESEK (8 db)
        { id: 1, name: 'Gulyásleves', price: 890 },
        { id: 2, name: 'Húsleves cérnametélttel', price: 750 },
        { id: 3, name: 'Gombaleves', price: 690 },
        { id: 4, name: 'Paradicsomleves', price: 590 },
        { id: 5, name: 'Jókai bableves', price: 850 },
        { id: 6, name: 'Tárkonyos raguleves', price: 790 },
        { id: 7, name: 'Újházy tyúkhúsleves', price: 950 },
        { id: 8, name: 'Palócleves', price: 890 },

        // FŐÉTELEK - HÚSOK (15 db)
        { id: 9, name: 'Rántott csirkemell', price: 1590 },
        { id: 10, name: 'Rántott sertésborda', price: 1690 },
        { id: 11, name: 'Bécsi szelet', price: 1890 },
        { id: 12, name: 'Cigánypecsenye', price: 1790 },
        { id: 13, name: 'Bakonyi sertésszelet', price: 1890 },
        { id: 14, name: 'Lecsós szelet', price: 1490 },
        { id: 15, name: 'Paprikás csirke', price: 1590 },
        { id: 16, name: 'Töltött káposzta', price: 1690 },
        { id: 17, name: 'Töltött paprika', price: 1490 },
        { id: 18, name: 'Fasírozott', price: 1290 },
        { id: 19, name: 'Hortobágyi palacsinta', price: 1390 },
        { id: 20, name: 'Székelykáposzta', price: 1590 },
        { id: 21, name: 'Borjúpörkölt', price: 2290 },
        { id: 22, name: 'Marhapörkölt', price: 1890 },
        { id: 23, name: 'Csirkepörkölt', price: 1490 },

        // KÖRETEK (10 db)
        { id: 24, name: 'Rizs', price: 390 },
        { id: 25, name: 'Hasábburgonya', price: 490 },
        { id: 26, name: 'Petrezselymes burgonya', price: 390 },
        { id: 27, name: 'Burgonyapüré', price: 450 },
        { id: 28, name: 'Párolt rizs', price: 350 },
        { id: 29, name: 'Galuska', price: 390 },
        { id: 30, name: 'Tészta (választható)', price: 350 },
        { id: 31, name: 'Krokett', price: 490 },
        { id: 32, name: 'Párolt zöldség', price: 490 },
        { id: 33, name: 'Savanyúság', price: 290 },

        // SALÁTÁK (8 db)
        { id: 34, name: 'Vitamin saláta', price: 590 },
        { id: 35, name: 'Cézár saláta', price: 1290 },
        { id: 36, name: 'Görög saláta', price: 990 },
        { id: 37, name: 'Uborkasaláta', price: 390 },
        { id: 38, name: 'Paradicsomsaláta', price: 450 },
        { id: 39, name: 'Káposztasaláta', price: 350 },
        { id: 40, name: 'Vegyes saláta', price: 690 },
        { id: 41, name: 'Céklasaláta', price: 390 },

        // DESSZERTEK (8 db)
        { id: 42, name: 'Somlói galuska', price: 890 },
        { id: 43, name: 'Túrógombóc', price: 790 },
        { id: 44, name: 'Gundel palacsinta', price: 990 },
        { id: 45, name: 'Mákos guba', price: 690 },
        { id: 46, name: 'Aranygaluska', price: 790 },
        { id: 47, name: 'Rétes (almás/túrós/meggyes)', price: 590 },
        { id: 48, name: 'Palacsinta (lekváros/túrós/nutellás)', price: 490 },
        { id: 49, name: 'Krémes', price: 490 },

        // ITALOK (8 db)
        { id: 50, name: 'Ásványvíz (0.5l)', price: 290 },
        { id: 51, name: 'Szénsavas üdítő (0.5l)', price: 350 },
        { id: 52, name: 'Gyümölcslé (2dl)', price: 290 },
        { id: 53, name: 'Tejeskávé', price: 390 },
        { id: 54, name: 'Presszó kávé', price: 290 },
        { id: 55, name: 'Tea', price: 250 },
        { id: 56, name: 'Forró csoki', price: 350 },
        { id: 57, name: 'Limonádé (0.3l)', price: 390 },

        // PÉKSÜTEMÉNYEK (8 db)
        { id: 58, name: 'Kifli', price: 90 },
        { id: 59, name: 'Zsemle', price: 80 },
        { id: 60, name: 'Kakaós csiga', price: 290 },
        { id: 61, name: 'Túrós táska', price: 320 },
        { id: 62, name: 'Sajtos pogácsa', price: 190 },
        { id: 63, name: 'Croissant', price: 350 },
        { id: 64, name: 'Lángos', price: 590 },
        { id: 65, name: 'Pizza szelet', price: 490 },
      ];

      await queryInterface.bulkInsert('products', products, { transaction });

      // ============================================
      // PURCHASES & PURCHASE_ITEMS (SIMPLIFIED SCHEMA)
      // ============================================

      // Helper: Generate lunch date
      const generateLunchDate = (daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const hour = 11 + Math.floor(Math.random() * 3);
        const minute = Math.floor(Math.random() * 60);
        date.setHours(hour, minute, 0, 0);
        return date;
      };

      const purchases = [];
      const purchaseItems = [];
      let purchaseItemId = 1;

      // Purchase configs: employeeId, daysAgo, items array [{productId, qty}], closed (boolean)
      const purchaseConfigs = [
        // Recent purchases (last week)
        { employeeId: 1, daysAgo: 1, items: [{ productId: 60, qty: 1 }, { productId: 57, qty: 1 }], closed: true },
        { employeeId: 3, daysAgo: 1, items: [{ productId: 11, qty: 1 }, { productId: 25, qty: 1 }, { productId: 51, qty: 1 }], closed: true },
        { employeeId: 5, daysAgo: 2, items: [{ productId: 1, qty: 1 }, { productId: 15, qty: 1 }, { productId: 29, qty: 1 }], closed: true },
        { employeeId: 7, daysAgo: 2, items: [{ productId: 63, qty: 1 }], closed: false }, // pending!
        { employeeId: 9, daysAgo: 3, items: [{ productId: 22, qty: 1 }, { productId: 27, qty: 1 }, { productId: 37, qty: 1 }], closed: true },
        { employeeId: 11, daysAgo: 3, items: [{ productId: 2, qty: 1 }, { productId: 16, qty: 1 }], closed: true },
        { employeeId: 13, daysAgo: 4, items: [{ productId: 35, qty: 1 }, { productId: 50, qty: 2 }], closed: true },
        { employeeId: 15, daysAgo: 4, items: [{ productId: 61, qty: 1 }, { productId: 42, qty: 1 }], closed: true },
        { employeeId: 17, daysAgo: 5, items: [{ productId: 9, qty: 1 }, { productId: 24, qty: 1 }, { productId: 33, qty: 1 }], closed: true },
        { employeeId: 19, daysAgo: 5, items: [{ productId: 5, qty: 1 }, { productId: 20, qty: 1 }], closed: true },

        // Last 2 weeks
        { employeeId: 2, daysAgo: 7, items: [{ productId: 12, qty: 1 }, { productId: 26, qty: 1 }, { productId: 57, qty: 1 }], closed: true },
        { employeeId: 4, daysAgo: 8, items: [{ productId: 3, qty: 1 }, { productId: 17, qty: 1 }], closed: true },
        { employeeId: 6, daysAgo: 9, items: [{ productId: 62, qty: 1 }], closed: true },
        { employeeId: 8, daysAgo: 10, items: [{ productId: 10, qty: 1 }, { productId: 25, qty: 1 }, { productId: 38, qty: 1 }, { productId: 59, qty: 1 }], closed: true },
        { employeeId: 10, daysAgo: 11, items: [{ productId: 21, qty: 1 }, { productId: 29, qty: 1 }], closed: true },
        { employeeId: 12, daysAgo: 12, items: [{ productId: 7, qty: 1 }, { productId: 13, qty: 1 }, { productId: 27, qty: 1 }], closed: true },
        { employeeId: 14, daysAgo: 13, items: [{ productId: 36, qty: 1 }, { productId: 54, qty: 1 }], closed: true },
        { employeeId: 16, daysAgo: 14, items: [{ productId: 60, qty: 1 }, { productId: 43, qty: 1 }], closed: true },

        // 3-4 weeks ago
        { employeeId: 18, daysAgo: 17, items: [{ productId: 4, qty: 1 }, { productId: 18, qty: 1 }, { productId: 31, qty: 1 }], closed: true },
        { employeeId: 20, daysAgo: 18, items: [{ productId: 14, qty: 1 }, { productId: 28, qty: 1 }], closed: true },
        { employeeId: 1, daysAgo: 20, items: [{ productId: 8, qty: 1 }, { productId: 19, qty: 1 }, { productId: 32, qty: 1 }], closed: true },
        { employeeId: 3, daysAgo: 21, items: [{ productId: 65, qty: 1 }], closed: true },
        { employeeId: 5, daysAgo: 22, items: [{ productId: 6, qty: 1 }, { productId: 23, qty: 1 }, { productId: 24, qty: 1 }], closed: true },
        { employeeId: 7, daysAgo: 24, items: [{ productId: 44, qty: 2 }, { productId: 58, qty: 2 }], closed: true },
        { employeeId: 9, daysAgo: 25, items: [{ productId: 61, qty: 1 }], closed: true },

        // 1-2 months ago
        { employeeId: 11, daysAgo: 30, items: [{ productId: 1, qty: 1 }, { productId: 11, qty: 1 }, { productId: 25, qty: 1 }, { productId: 51, qty: 1 }], closed: true },
        { employeeId: 13, daysAgo: 35, items: [{ productId: 2, qty: 1 }, { productId: 15, qty: 1 }, { productId: 29, qty: 1 }], closed: true },
        { employeeId: 15, daysAgo: 40, items: [{ productId: 63, qty: 1 }, { productId: 45, qty: 1 }], closed: true },
        { employeeId: 17, daysAgo: 42, items: [{ productId: 22, qty: 1 }, { productId: 27, qty: 1 }], closed: true },
        { employeeId: 19, daysAgo: 45, items: [{ productId: 5, qty: 1 }, { productId: 16, qty: 1 }, { productId: 33, qty: 1 }], closed: true },
        { employeeId: 2, daysAgo: 48, items: [{ productId: 35, qty: 1 }], closed: true },
        { employeeId: 4, daysAgo: 50, items: [{ productId: 60, qty: 1 }, { productId: 46, qty: 1 }], closed: true },
        { employeeId: 6, daysAgo: 52, items: [{ productId: 9, qty: 1 }, { productId: 26, qty: 1 }, { productId: 37, qty: 1 }, { productId: 57, qty: 1 }], closed: true },

        // 2-3 months ago
        { employeeId: 8, daysAgo: 60, items: [{ productId: 3, qty: 1 }, { productId: 12, qty: 1 }, { productId: 31, qty: 1 }], closed: true },
        { employeeId: 10, daysAgo: 65, items: [{ productId: 62, qty: 1 }, { productId: 47, qty: 1 }], closed: true },
        { employeeId: 12, daysAgo: 70, items: [{ productId: 7, qty: 1 }, { productId: 21, qty: 1 }, { productId: 28, qty: 1 }], closed: true },
        { employeeId: 14, daysAgo: 75, items: [{ productId: 36, qty: 1 }, { productId: 48, qty: 1 }, { productId: 55, qty: 1 }], closed: true },
        { employeeId: 16, daysAgo: 78, items: [{ productId: 4, qty: 1 }, { productId: 13, qty: 1 }, { productId: 24, qty: 1 }], closed: true },
        { employeeId: 18, daysAgo: 82, items: [{ productId: 64, qty: 2 }], closed: true },
        { employeeId: 20, daysAgo: 85, items: [{ productId: 6, qty: 1 }, { productId: 19, qty: 1 }, { productId: 29, qty: 1 }, { productId: 50, qty: 1 }], closed: true },
      ];

      // Build products lookup for prices
      const productPrices = {};
      products.forEach((p) => {
        productPrices[p.id] = p.price;
      });

      // Generate purchases and purchase items
      purchaseConfigs.forEach((config, index) => {
        const purchaseDate = generateLunchDate(config.daysAgo);
        let total = 0;

        // Calculate total
        config.items.forEach((item) => {
          total += productPrices[item.productId] * item.qty;
        });

        // Add purchase (SIMPLIFIED: id, employeeId, userId, date, total, closed)
        purchases.push({
          id: index + 1,
          employeeId: config.employeeId,
          userId: 1, // admin user created all demo purchases
          date: purchaseDate,
          total,
          closed: config.closed,
        });

        // Add purchase items (SIMPLIFIED: id, purchaseId, productId, quantity)
        config.items.forEach((item) => {
          purchaseItems.push({
            id: purchaseItemId++,
            purchaseId: index + 1,
            productId: item.productId,
            quantity: item.qty,
          });
        });
      });

      await queryInterface.bulkInsert('purchases', purchases, { transaction });
      await queryInterface.bulkInsert('purchase_items', purchaseItems, { transaction });

      await transaction.commit();
      console.log('✅ Magyar kantinos adatbázis sikeresen feltöltve!');
      console.log(`   👤 ${users.length} felhasználó`);
      console.log(`   📋 ${employees.length} dolgozó`);
      console.log(`   🍽️  ${products.length} termék`);
      console.log(`   🛒 ${purchases.length} vásárlás`);
      console.log(`   📦 ${purchaseItems.length} vásárlás tétel`);
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Hiba az adatbázis feltöltésekor:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.bulkDelete('audit_logs', null, { transaction });
      await queryInterface.bulkDelete('purchase_items', null, { transaction });
      await queryInterface.bulkDelete('purchases', null, { transaction });
      await queryInterface.bulkDelete('products', null, { transaction });
      await queryInterface.bulkDelete('users', null, { transaction });
      await queryInterface.bulkDelete('employees', null, { transaction });

      await transaction.commit();
      console.log('✅ Adatbázis sikeresen kiürítve');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Hiba az adatbázis kiürítésekor:', error);
      throw error;
    }
  },
};
