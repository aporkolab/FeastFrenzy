'use strict';

const bcrypt = require('bcrypt');

/**
 * Magyar kantinrendszer demo felhasználók
 *
 * Login credentials:
 * - Admin: admin@kantinrendszer.hu / Admin123!
 * - Manager: vezerigazgato@cegem.hu / Manager123!
 * - Employee: kovacs.peter@cegem.hu / Employee123!
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;

    const adminPassword = await bcrypt.hash('Admin123!', rounds);
    const managerPassword = await bcrypt.hash('Manager123!', rounds);
    const employeePassword = await bcrypt.hash('Employee123!', rounds);

    const now = new Date();

    await queryInterface.bulkInsert('users', [
      {
        email: 'admin@kantinrendszer.hu',
        password: adminPassword,
        name: 'Rendszergazda',
        role: 'admin',
        refreshToken: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLogin: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        email: 'vezerigazgato@cegem.hu',
        password: managerPassword,
        name: 'Dr. Szabó József',
        role: 'manager',
        refreshToken: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLogin: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        email: 'kovacs.peter@cegem.hu',
        password: employeePassword,
        name: 'Kovács Péter',
        role: 'employee',
        refreshToken: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLogin: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    console.log('✅ Magyar felhasználók sikeresen létrehozva!');
    console.log('   📧 admin@kantinrendszer.hu / Admin123!');
    console.log('   📧 vezerigazgato@cegem.hu / Manager123!');
    console.log('   📧 kovacs.peter@cegem.hu / Employee123!');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      email: {
        [Sequelize.Op.in]: [
          'admin@kantinrendszer.hu',
          'vezerigazgato@cegem.hu',
          'kovacs.peter@cegem.hu',
        ],
      },
    });
  },
};
