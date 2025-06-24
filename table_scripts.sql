-- Adatbázis létrehozása

CREATE DATABASE sales_db;

-- Adatbázis kiválasztása
USE sales_db;

-- Értékesítések tábla létrehozása

CREATE TABLE purchases (
id INT AUTO_INCREMENT PRIMARY KEY,
employeeId INT NOT NULL,
date DATE NOT NULL,
closed BOOLEAN NOT NULL DEFAULT FALSE,
total DECIMAL(10, 2),
FOREIGN KEY (employeeId) REFERENCES employees(id));

-- Dolgozók tábla létrehozása

CREATE TABLE employees (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(255) NOT NULL,
employee_number VARCHAR(255) NOT NULL UNIQUE,
monthlyConsumptionValue DECIMAL(10, 2)
);

-- Termékek tábla létrehozása

CREATE TABLE products (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR (255) NOT NULL,
price DECIMAL(10,2) NOT NULL,
UNIQUE (name),
);

-- Vásárlások elemei tábla létrehozása

CREATE TABLE purchase_items (
id INT AUTO_INCREMENT PRIMARY KEY,
purchaseId INT NOT NULL,
productId INT NOT NULL,
quantity INT NOT NULL,
price DECIMAL(10,2) NOT NULL,
FOREIGN KEY (purchaseId) REFERENCES purchases(id),
FOREIGN KEY (productId) REFERENCES products(id);

-- Alapadatok hozzáadása a dolgozók táblához
INSERT INTO employees (name, employee_number, monthlyConsumptionValue) VALUES
('John Smith', '12345', 0),
('Jane Doe', '67890', 0);

-- Alapadatok hozzáadása a termékek táblához

INSERT INTO products (name, price) VALUES
('Soup', 3.99),
('Sandwich', 5.99),
('Coffee', 2.50);

-- Alapadatok hozzáadása a vásárlások táblához

INSERT INTO purchases (date, employeeId) VALUES
(current_date(), 1),
(current_date(), 2);

-- Alapadatok hozzáadása a vásárlások elemei táblához

INSERT INTO purchase_items (purchaseId, productId, quantity, price) VALUES
(1, 1, 2, 7.98),
(1, 2, 1, 5.99),
(2, 3, 3, 7.5);

-- Az SQL szkript végén tegyünk egy UPDATE utasítást, hogy számítsuk ki és frissítsük a total oszlopot a purchase táblában.
UPDATE purchases SET total = (SELECT SUM(quantity * price) FROM purchase_items WHERE purchaseId = purchases.id);

-- Az SQL szkript végén tegyünk egy ALTER TABLE utasítást, hogy hozzáadjuk a monthlyConsumptionValue oszlopot az employees táblához.
ALTER TABLE employees ADD monthlyConsumptionValue DECIMAL(10, 2);

-- Az SQL szkript végén tegyünk egy UPDATE utasítást, hogy számítsuk ki és frissítsük a monthlyConsumptionValue oszlopot az employees táblában.

UPDATE employees SET monthlyConsumptionValue = (SELECT SUM(quantity * price) FROM purchase_items JOIN purchases ON purchase_items.purchaseId = purchases.id WHERE purchases.employeeId = employees.id);

-- Az SQL szkript végén tegyünk egy CREATE TRIGGER utasítást, hogy automatikusan frissítsük a purchase táblában az total értékét, amikor új vásárlás elemet adunk hozzá.

CREATE TRIGGER update_purchase_total
AFTER INSERT ON purchase_items
FOR EACH ROW
UPDATE purchases SET total = total + (NEW.quantity * NEW.price) WHERE purchases.id = NEW.purchaseId;

-- Az SQL szkript végén tegyünk egy CREATE TRIGGER utasítást, hogy automatikusan frissítsük a purchase táblában lévő total oszlopot, ha a purchase_items táblában valami változik.

CREATE TRIGGER update_purchase_total
AFTER INSERT OR UPDATE OR DELETE ON purchase_items
FOR EACH ROW
BEGIN
UPDATE purchases SET total = (SELECT SUM(quantity * price) FROM purchase_items WHERE purchaseId = purchases.id);
END;

-- Az SQL szkript végén tegyünk egy CREATE TRIGGER utasítást, hogy automatikusan frissítsük az employees táblában lévő monthlyConsumptionValue oszlopot, ha a purchase_items táblában valami változik.

CREATE TRIGGER update_employee_monthly_consumption
AFTER INSERT OR UPDATE OR DELETE ON purchase_items
FOR EACH ROW
BEGIN
UPDATE employees SET monthlyConsumptionValue = (SELECT SUM(quantity * price) FROM purchase_items JOIN purchases ON purchase_items.purchaseId = purchases.id WHERE purchases.employeeId = employees.id);
END;

-- Az SQL szkript végén tegyünk egy COMMIT utasítást, hogy véglegesítsük az összes változtatást.
COMMIT;

-- Az SQL szkript végén tegyünk egy utasítást, hogy lezárjuk az adatbázis kapcsolatot.
DISCONNECT;