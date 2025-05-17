'use strict';

const bcrypt = require('bcrypt');

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
        { id: 1, name: 'Kovács Péter', employee_number: 'EMP001', monthlyConsumptionValue: 25000 },
        { id: 2, name: 'Nagy Erzsébet', employee_number: 'EMP002', monthlyConsumptionValue: 20000 },
        { id: 3, name: 'Szabó András', employee_number: 'EMP003', monthlyConsumptionValue: 30000 },
        { id: 4, name: 'Tóth Katalin', employee_number: 'EMP004', monthlyConsumptionValue: 22000 },
        { id: 5, name: 'Horváth István', employee_number: 'EMP005', monthlyConsumptionValue: 28000 },
        { id: 6, name: 'Kiss Zsuzsanna', employee_number: 'EMP006', monthlyConsumptionValue: 18000 },
        { id: 7, name: 'Molnár Gábor', employee_number: 'EMP007', monthlyConsumptionValue: 35000 },
        { id: 8, name: 'Varga Mária', employee_number: 'EMP008', monthlyConsumptionValue: 21000 },
        { id: 9, name: 'Balogh László', employee_number: 'EMP009', monthlyConsumptionValue: 27000 },
        { id: 10, name: 'Fekete Anna', employee_number: 'EMP010', monthlyConsumptionValue: 23000 },
        { id: 11, name: 'Lakatos Tamás', employee_number: 'EMP011', monthlyConsumptionValue: 31000 },
        { id: 12, name: 'Oláh Judit', employee_number: 'EMP012', monthlyConsumptionValue: 19000 },
        { id: 13, name: 'Simon Béla', employee_number: 'EMP013', monthlyConsumptionValue: 26000 },
        { id: 14, name: 'Farkas Éva', employee_number: 'EMP014', monthlyConsumptionValue: 24000 },
        { id: 15, name: 'Németh Zoltán', employee_number: 'EMP015', monthlyConsumptionValue: 29000 },
        { id: 16, name: 'Papp Ildikó', employee_number: 'EMP016', monthlyConsumptionValue: 20000 },
        { id: 17, name: 'Takács Ferenc', employee_number: 'EMP017', monthlyConsumptionValue: 32000 },
        { id: 18, name: 'Juhász Klára', employee_number: 'EMP018', monthlyConsumptionValue: 17000 },
        { id: 19, name: 'Szűcs Attila', employee_number: 'EMP019', monthlyConsumptionValue: 25000 },
        { id: 20, name: 'Budai Szilvia', employee_number: 'EMP020', monthlyConsumptionValue: 22000 },
      ];

      await queryInterface.bulkInsert('employees', employees, { transaction });

      // ============================================
      // PRODUCTS - 65 Hungarian Canteen Foods
      // ============================================
      const products = [
        // LEVESEK (8 db) - Category: Levesek
        { id: 1, name: 'Gulyásleves', description: 'Hagyományos magyar gulyásleves marhahússal', price: 890, category: 'Levesek', availability: true, createdAt: now, updatedAt: now },
        { id: 2, name: 'Húsleves cérnametélttel', description: 'Erős tyúkhúsleves házi cérnametélttel', price: 750, category: 'Levesek', availability: true, createdAt: now, updatedAt: now },
        { id: 3, name: 'Gombaleves', description: 'Tejszínes erdei gombaleves', price: 690, category: 'Levesek', availability: true, createdAt: now, updatedAt: now },
        { id: 4, name: 'Paradicsomleves', description: 'Klasszikus paradicsomleves tésztával', price: 590, category: 'Levesek', availability: true, createdAt: now, updatedAt: now },
        { id: 5, name: 'Jókai bableves', description: 'Tartalmas bableves füstölt csülökkel', price: 850, category: 'Levesek', availability: true, createdAt: now, updatedAt: now },
        { id: 6, name: 'Tárkonyos raguleves', description: 'Fűszeres csirkeragu leves', price: 790, category: 'Levesek', availability: true, createdAt: now, updatedAt: now },
        { id: 7, name: 'Újházy tyúkhúsleves', description: 'Gazdag tyúkhúsleves zöldségekkel', price: 950, category: 'Levesek', availability: true, createdAt: now, updatedAt: now },
        { id: 8, name: 'Palócleves', description: 'Bárányhúsos palócleves tejföllel', price: 890, category: 'Levesek', availability: true, createdAt: now, updatedAt: now },

        // FŐÉTELEK - HÚSOK (15 db) - Category: Főételek
        { id: 9, name: 'Rántott csirkemell', description: 'Ropogós bundában sült csirkemell', price: 1590, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },
        { id: 10, name: 'Rántott sertésborda', description: 'Hagyományos rántott sertésborda', price: 1690, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },
        { id: 11, name: 'Bécsi szelet', description: 'Klasszikus bécsi szelet citrommal', price: 1890, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },
        { id: 12, name: 'Cigánypecsenye', description: 'Fűszeres cigánypecsenye hagymával', price: 1790, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },
        { id: 13, name: 'Bakonyi sertésszelet', description: 'Gombás-tejszínes sertésszelet', price: 1890, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },
        { id: 14, name: 'Lecsós szelet', description: 'Paprikás-paradicsomos lecsón sült hús', price: 1490, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },
        { id: 15, name: 'Paprikás csirke', description: 'Tejfölös paprikás csirke galuskával', price: 1590, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },
        { id: 16, name: 'Töltött káposzta', description: 'Savanyú káposztában főtt töltött káposzta', price: 1690, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },
        { id: 17, name: 'Töltött paprika', description: 'Paradicsomszószos töltött paprika', price: 1490, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },
        { id: 18, name: 'Fasírozott', description: 'Házi darált húspogácsa', price: 1290, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },
        { id: 19, name: 'Hortobágyi palacsinta', description: 'Húsos palacsinta tejfölös szószban', price: 1390, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },
        { id: 20, name: 'Székelykáposzta', description: 'Savanyú káposzta sertéshússal tejföllel', price: 1590, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },
        { id: 21, name: 'Borjúpörkölt', description: 'Prémium borjúpörkölt nokedlivel', price: 2290, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },
        { id: 22, name: 'Marhapörkölt', description: 'Lassú tűzön főtt marhapörkölt', price: 1890, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },
        { id: 23, name: 'Csirkepörkölt', description: 'Fűszeres csirkepörkölt galuskával', price: 1490, category: 'Főételek', availability: true, createdAt: now, updatedAt: now },

        // KÖRETEK (10 db) - Category: Köretek
        { id: 24, name: 'Rizs', description: 'Párolt hosszúszemű rizs', price: 390, category: 'Köretek', availability: true, createdAt: now, updatedAt: now },
        { id: 25, name: 'Hasábburgonya', description: 'Ropogósra sült hasábburgonya', price: 490, category: 'Köretek', availability: true, createdAt: now, updatedAt: now },
        { id: 26, name: 'Petrezselymes burgonya', description: 'Vajban pirított petrezselymes burgonya', price: 390, category: 'Köretek', availability: true, createdAt: now, updatedAt: now },
        { id: 27, name: 'Burgonyapüré', description: 'Krémes, vajas burgonyapüré', price: 450, category: 'Köretek', availability: true, createdAt: now, updatedAt: now },
        { id: 28, name: 'Párolt rizs', description: 'Könnyű, vajas párolt rizs', price: 350, category: 'Köretek', availability: true, createdAt: now, updatedAt: now },
        { id: 29, name: 'Galuska', description: 'Házi nokedli/galuska', price: 390, category: 'Köretek', availability: true, createdAt: now, updatedAt: now },
        { id: 30, name: 'Tészta (választható)', description: 'Vajas tészta választható formában', price: 350, category: 'Köretek', availability: true, createdAt: now, updatedAt: now },
        { id: 31, name: 'Krokett', description: 'Aranybarna sült krokett', price: 490, category: 'Köretek', availability: true, createdAt: now, updatedAt: now },
        { id: 32, name: 'Párolt zöldség', description: 'Szezonális párolt zöldségkeverék', price: 490, category: 'Köretek', availability: true, createdAt: now, updatedAt: now },
        { id: 33, name: 'Savanyúság', description: 'Vegyes házi savanyúság', price: 290, category: 'Köretek', availability: true, createdAt: now, updatedAt: now },

        // SALÁTÁK (8 db) - Category: Saláták
        { id: 34, name: 'Vitamin saláta', description: 'Friss szezonális zöldségekből', price: 590, category: 'Saláták', availability: true, createdAt: now, updatedAt: now },
        { id: 35, name: 'Cézár saláta', description: 'Római saláta csirkemellel, parmezánnal', price: 1290, category: 'Saláták', availability: true, createdAt: now, updatedAt: now },
        { id: 36, name: 'Görög saláta', description: 'Fetával, olívabogyóval, friss zöldségekkel', price: 990, category: 'Saláták', availability: true, createdAt: now, updatedAt: now },
        { id: 37, name: 'Uborkasaláta', description: 'Kapros-tejfölös uborkasaláta', price: 390, category: 'Saláták', availability: true, createdAt: now, updatedAt: now },
        { id: 38, name: 'Paradicsomsaláta', description: 'Szeletelt paradicsom hagymával', price: 450, category: 'Saláták', availability: true, createdAt: now, updatedAt: now },
        { id: 39, name: 'Káposztasaláta', description: 'Ecetes, köményes káposztasaláta', price: 350, category: 'Saláták', availability: true, createdAt: now, updatedAt: now },
        { id: 40, name: 'Vegyes saláta', description: 'Szezonális vegyes zöldsaláta', price: 690, category: 'Saláták', availability: true, createdAt: now, updatedAt: now },
        { id: 41, name: 'Céklasaláta', description: 'Tormás céklasaláta', price: 390, category: 'Saláták', availability: true, createdAt: now, updatedAt: now },

        // DESSZERTEK (8 db) - Category: Desszertek
        { id: 42, name: 'Somlói galuska', description: 'Klasszikus somlói galuska csokival, tejszínhabbal', price: 890, category: 'Desszertek', availability: true, createdAt: now, updatedAt: now },
        { id: 43, name: 'Túrógombóc', description: 'Vaníliás túrógombóc zsemlemorzsával', price: 790, category: 'Desszertek', availability: true, createdAt: now, updatedAt: now },
        { id: 44, name: 'Gundel palacsinta', description: 'Diós palacsinta csokoládészószban', price: 990, category: 'Desszertek', availability: true, createdAt: now, updatedAt: now },
        { id: 45, name: 'Mákos guba', description: 'Édes mákos guba vaníliaszósszal', price: 690, category: 'Desszertek', availability: true, createdAt: now, updatedAt: now },
        { id: 46, name: 'Aranygaluska', description: 'Vaníliás aranygaluska', price: 790, category: 'Desszertek', availability: true, createdAt: now, updatedAt: now },
        { id: 47, name: 'Rétes (almás/túrós/meggyes)', description: 'Házi rétes választható töltelékkel', price: 590, category: 'Desszertek', availability: true, createdAt: now, updatedAt: now },
        { id: 48, name: 'Palacsinta (lekváros/túrós/nutellás)', description: 'Édes palacsinta választható töltelékkel', price: 490, category: 'Desszertek', availability: true, createdAt: now, updatedAt: now },
        { id: 49, name: 'Gyümölcssaláta', description: 'Friss szezonális gyümölcsök', price: 590, category: 'Desszertek', availability: true, createdAt: now, updatedAt: now },

        // ITALOK (10 db) - Category: Italok
        { id: 50, name: 'Ásványvíz 0.5l', description: 'Szénsavas/mentes ásványvíz', price: 290, category: 'Italok', availability: true, createdAt: now, updatedAt: now },
        { id: 51, name: 'Coca-Cola 0.5l', description: 'Eredeti Coca-Cola', price: 450, category: 'Italok', availability: true, createdAt: now, updatedAt: now },
        { id: 52, name: 'Fanta 0.5l', description: 'Narancsos üdítőital', price: 450, category: 'Italok', availability: true, createdAt: now, updatedAt: now },
        { id: 53, name: 'Sprite 0.5l', description: 'Citromos-lime-os üdítő', price: 450, category: 'Italok', availability: true, createdAt: now, updatedAt: now },
        { id: 54, name: 'Limonádé', description: 'Házi citrom limonádé', price: 390, category: 'Italok', availability: true, createdAt: now, updatedAt: now },
        { id: 55, name: 'Almalé 0.3l', description: '100% almalé', price: 350, category: 'Italok', availability: true, createdAt: now, updatedAt: now },
        { id: 56, name: 'Narancslé 0.3l', description: '100% narancslé', price: 350, category: 'Italok', availability: true, createdAt: now, updatedAt: now },
        { id: 57, name: 'Kávé', description: 'Presszó kávé', price: 350, category: 'Italok', availability: true, createdAt: now, updatedAt: now },
        { id: 58, name: 'Tea', description: 'Fekete/zöld/gyümölcs tea', price: 290, category: 'Italok', availability: true, createdAt: now, updatedAt: now },
        { id: 59, name: 'Cappuccino', description: 'Olasz cappuccino', price: 450, category: 'Italok', availability: true, createdAt: now, updatedAt: now },

        // MENÜK (6 db) - Category: Menük
        { id: 60, name: 'Napi menü A (leves + főétel + köret)', description: 'A napi ajánlat - változó', price: 1990, category: 'Menük', availability: true, createdAt: now, updatedAt: now },
        { id: 61, name: 'Napi menü B (leves + főétel + köret)', description: 'B napi ajánlat - változó', price: 1990, category: 'Menük', availability: true, createdAt: now, updatedAt: now },
        { id: 62, name: 'Napi menü C - vegetáriánus', description: 'Húsmentes napi ajánlat', price: 1790, category: 'Menük', availability: true, createdAt: now, updatedAt: now },
        { id: 63, name: 'Fitnesz menü (csirkemell + saláta)', description: 'Könnyű, egészséges ebéd', price: 2190, category: 'Menük', availability: true, createdAt: now, updatedAt: now },
        { id: 64, name: 'Gyerek menü', description: 'Kisebb adag gyerekeknek', price: 1290, category: 'Menük', availability: true, createdAt: now, updatedAt: now },
        { id: 65, name: 'Szendvics menü (szendvics + üdítő)', description: 'Gyors szendvics ebéd', price: 1190, category: 'Menük', availability: true, createdAt: now, updatedAt: now },
      ];

      await queryInterface.bulkInsert('products', products, { transaction });

      // ============================================
      // PURCHASES - 40 Realistic Purchases (Last 3 Months)
      // Weekdays only, 11:00-14:00 lunch time
      // ============================================

      // Helper to generate weekday lunch time dates
      const generateLunchDate = (daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);

        // Shift to weekday if weekend
        const day = date.getDay();
        if (day === 0) {date.setDate(date.getDate() - 2);} // Sunday -> Friday
        if (day === 6) {date.setDate(date.getDate() - 1);} // Saturday -> Friday

        // Set lunch time between 11:00 and 14:00
        const hour = 11 + Math.floor(Math.random() * 3);
        const minute = Math.floor(Math.random() * 60);
        date.setHours(hour, minute, 0, 0);
        return date;
      };

      const purchases = [];
      const purchaseItems = [];
      let purchaseItemId = 1;

      // Purchase configurations - employeeId, daysAgo, items array [{productId, qty}], status
      const purchaseConfigs = [
        // Recent purchases (last week) - mostly completed
        { employeeId: 1, daysAgo: 1, items: [{ productId: 60, qty: 1 }, { productId: 57, qty: 1 }], status: 'completed' },
        { employeeId: 3, daysAgo: 1, items: [{ productId: 11, qty: 1 }, { productId: 25, qty: 1 }, { productId: 51, qty: 1 }], status: 'completed' },
        { employeeId: 5, daysAgo: 2, items: [{ productId: 1, qty: 1 }, { productId: 15, qty: 1 }, { productId: 29, qty: 1 }], status: 'completed' },
        { employeeId: 7, daysAgo: 2, items: [{ productId: 63, qty: 1 }], status: 'pending' },
        { employeeId: 9, daysAgo: 3, items: [{ productId: 22, qty: 1 }, { productId: 27, qty: 1 }, { productId: 37, qty: 1 }], status: 'completed' },
        { employeeId: 11, daysAgo: 3, items: [{ productId: 2, qty: 1 }, { productId: 16, qty: 1 }], status: 'completed' },
        { employeeId: 13, daysAgo: 4, items: [{ productId: 35, qty: 1 }, { productId: 50, qty: 2 }], status: 'completed' },
        { employeeId: 15, daysAgo: 4, items: [{ productId: 61, qty: 1 }, { productId: 42, qty: 1 }], status: 'completed' },
        { employeeId: 17, daysAgo: 5, items: [{ productId: 9, qty: 1 }, { productId: 24, qty: 1 }, { productId: 33, qty: 1 }], status: 'completed' },
        { employeeId: 19, daysAgo: 5, items: [{ productId: 5, qty: 1 }, { productId: 20, qty: 1 }], status: 'completed' },

        // Last 2 weeks
        { employeeId: 2, daysAgo: 7, items: [{ productId: 12, qty: 1 }, { productId: 26, qty: 1 }, { productId: 57, qty: 1 }], status: 'completed' },
        { employeeId: 4, daysAgo: 8, items: [{ productId: 3, qty: 1 }, { productId: 17, qty: 1 }], status: 'completed' },
        { employeeId: 6, daysAgo: 9, items: [{ productId: 62, qty: 1 }], status: 'completed' },
        { employeeId: 8, daysAgo: 10, items: [{ productId: 10, qty: 1 }, { productId: 25, qty: 1 }, { productId: 38, qty: 1 }, { productId: 59, qty: 1 }], status: 'completed' },
        { employeeId: 10, daysAgo: 11, items: [{ productId: 21, qty: 1 }, { productId: 29, qty: 1 }], status: 'completed' },
        { employeeId: 12, daysAgo: 12, items: [{ productId: 7, qty: 1 }, { productId: 13, qty: 1 }, { productId: 27, qty: 1 }], status: 'completed' },
        { employeeId: 14, daysAgo: 13, items: [{ productId: 36, qty: 1 }, { productId: 54, qty: 1 }], status: 'completed' },
        { employeeId: 16, daysAgo: 14, items: [{ productId: 60, qty: 1 }, { productId: 43, qty: 1 }], status: 'completed' },

        // 3-4 weeks ago
        { employeeId: 18, daysAgo: 17, items: [{ productId: 4, qty: 1 }, { productId: 18, qty: 1 }, { productId: 31, qty: 1 }], status: 'completed' },
        { employeeId: 20, daysAgo: 18, items: [{ productId: 14, qty: 1 }, { productId: 28, qty: 1 }], status: 'completed' },
        { employeeId: 1, daysAgo: 20, items: [{ productId: 8, qty: 1 }, { productId: 19, qty: 1 }, { productId: 32, qty: 1 }], status: 'completed' },
        { employeeId: 3, daysAgo: 21, items: [{ productId: 65, qty: 1 }], status: 'completed' },
        { employeeId: 5, daysAgo: 22, items: [{ productId: 6, qty: 1 }, { productId: 23, qty: 1 }, { productId: 24, qty: 1 }], status: 'completed' },
        { employeeId: 7, daysAgo: 24, items: [{ productId: 44, qty: 2 }, { productId: 58, qty: 2 }], status: 'completed' },
        { employeeId: 9, daysAgo: 25, items: [{ productId: 61, qty: 1 }], status: 'completed' },

        // 1-2 months ago
        { employeeId: 11, daysAgo: 30, items: [{ productId: 1, qty: 1 }, { productId: 11, qty: 1 }, { productId: 25, qty: 1 }, { productId: 51, qty: 1 }], status: 'completed' },
        { employeeId: 13, daysAgo: 35, items: [{ productId: 2, qty: 1 }, { productId: 15, qty: 1 }, { productId: 29, qty: 1 }], status: 'completed' },
        { employeeId: 15, daysAgo: 40, items: [{ productId: 63, qty: 1 }, { productId: 45, qty: 1 }], status: 'completed' },
        { employeeId: 17, daysAgo: 42, items: [{ productId: 22, qty: 1 }, { productId: 27, qty: 1 }], status: 'cancelled' },
        { employeeId: 19, daysAgo: 45, items: [{ productId: 5, qty: 1 }, { productId: 16, qty: 1 }, { productId: 33, qty: 1 }], status: 'completed' },
        { employeeId: 2, daysAgo: 48, items: [{ productId: 35, qty: 1 }], status: 'completed' },
        { employeeId: 4, daysAgo: 50, items: [{ productId: 60, qty: 1 }, { productId: 46, qty: 1 }], status: 'completed' },
        { employeeId: 6, daysAgo: 52, items: [{ productId: 9, qty: 1 }, { productId: 26, qty: 1 }, { productId: 37, qty: 1 }, { productId: 57, qty: 1 }], status: 'completed' },

        // 2-3 months ago
        { employeeId: 8, daysAgo: 60, items: [{ productId: 3, qty: 1 }, { productId: 12, qty: 1 }, { productId: 31, qty: 1 }], status: 'completed' },
        { employeeId: 10, daysAgo: 65, items: [{ productId: 62, qty: 1 }, { productId: 47, qty: 1 }], status: 'completed' },
        { employeeId: 12, daysAgo: 70, items: [{ productId: 7, qty: 1 }, { productId: 21, qty: 1 }, { productId: 28, qty: 1 }], status: 'completed' },
        { employeeId: 14, daysAgo: 75, items: [{ productId: 36, qty: 1 }, { productId: 48, qty: 1 }, { productId: 55, qty: 1 }], status: 'completed' },
        { employeeId: 16, daysAgo: 78, items: [{ productId: 4, qty: 1 }, { productId: 13, qty: 1 }, { productId: 24, qty: 1 }], status: 'completed' },
        { employeeId: 18, daysAgo: 82, items: [{ productId: 64, qty: 2 }], status: 'completed' },
        { employeeId: 20, daysAgo: 85, items: [{ productId: 6, qty: 1 }, { productId: 19, qty: 1 }, { productId: 29, qty: 1 }, { productId: 50, qty: 1 }], status: 'completed' },
      ];

      // Build products lookup for prices
      const productPrices = {};
      products.forEach((p) => {
        productPrices[p.id] = p.price;
      });

      // Generate purchases and purchase items
      purchaseConfigs.forEach((config, index) => {
        const purchaseDate = generateLunchDate(config.daysAgo);
        let totalAmount = 0;

        // Calculate total and prepare items
        const itemsForPurchase = config.items.map((item) => {
          const unitPrice = productPrices[item.productId];
          const totalPrice = unitPrice * item.qty;
          totalAmount += totalPrice;
          return {
            productId: item.productId,
            quantity: item.qty,
            unitPrice,
            totalPrice,
          };
        });

        // Add purchase
        purchases.push({
          id: index + 1,
          employeeId: config.employeeId,
          totalAmount,
          status: config.status,
          purchaseDate,
          createdAt: purchaseDate,
          updatedAt: purchaseDate,
        });

        // Add purchase items
        itemsForPurchase.forEach((item) => {
          purchaseItems.push({
            id: purchaseItemId++,
            purchaseId: index + 1,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            createdAt: purchaseDate,
            updatedAt: purchaseDate,
          });
        });
      });

      await queryInterface.bulkInsert('purchases', purchases, { transaction });
      await queryInterface.bulkInsert('purchase_items', purchaseItems, { transaction });

      await transaction.commit();
      console.log('✅ Magyar kantinos adatbázis sikeresen feltöltve!');
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
      await queryInterface.bulkDelete('purchase_items', null, { transaction });
      await queryInterface.bulkDelete('purchases', null, { transaction });
      await queryInterface.bulkDelete('products', null, { transaction });
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
