'use strict';

/**
 * Add security-related fields to users table
 * - passwordResetToken
 * - passwordResetExpires
 * - failedLoginAttempts
 * - lockoutUntil
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Adding security fields to users table...');

    // Check if columns exist before adding
    const tableInfo = await queryInterface.describeTable('users');

    if (!tableInfo.passwordResetToken) {
      await queryInterface.addColumn('users', 'passwordResetToken', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Token for password reset flow',
      });
    }

    if (!tableInfo.passwordResetExpires) {
      await queryInterface.addColumn('users', 'passwordResetExpires', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Expiration time for password reset token',
      });
    }

    if (!tableInfo.failedLoginAttempts) {
      await queryInterface.addColumn('users', 'failedLoginAttempts', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Counter for failed login attempts',
      });
    }

    if (!tableInfo.lockoutUntil) {
      await queryInterface.addColumn('users', 'lockoutUntil', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Account lockout expiration',
      });

      // Add index for lockout queries
      await queryInterface.addIndex('users', ['lockoutUntil'], {
        name: 'idx_users_lockoutUntil',
      });
    }

    console.log('Security fields added successfully!');
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('users');

    if (tableInfo.lockoutUntil) {
      await queryInterface.removeIndex('users', 'idx_users_lockoutUntil');
      await queryInterface.removeColumn('users', 'lockoutUntil');
    }

    if (tableInfo.failedLoginAttempts) {
      await queryInterface.removeColumn('users', 'failedLoginAttempts');
    }

    if (tableInfo.passwordResetExpires) {
      await queryInterface.removeColumn('users', 'passwordResetExpires');
    }

    if (tableInfo.passwordResetToken) {
      await queryInterface.removeColumn('users', 'passwordResetToken');
    }
  },
};
