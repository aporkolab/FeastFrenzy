'use strict';

const bcrypt = require('bcrypt');


module.exports = {
  async up(queryInterface, Sequelize) {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;

    
    const adminPassword = await bcrypt.hash('Admin123!', rounds);
    const managerPassword = await bcrypt.hash('Manager123!', rounds);
    const employeePassword = await bcrypt.hash('Employee123!', rounds);

    const now = new Date();

    await queryInterface.bulkInsert('users', [
      {
        email: 'admin@feastfrenzy.com',
        password: adminPassword,
        name: 'Admin User',
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
        email: 'manager@feastfrenzy.com',
        password: managerPassword,
        name: 'Manager User',
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
        email: 'employee@feastfrenzy.com',
        password: employeePassword,
        name: 'Employee User',
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      email: {
        [Sequelize.Op.in]: [
          'admin@feastfrenzy.com',
          'manager@feastfrenzy.com',
          'employee@feastfrenzy.com',
        ],
      },
    });
  },
};
