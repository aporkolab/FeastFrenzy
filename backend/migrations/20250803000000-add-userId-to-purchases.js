'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('purchases', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    
    await queryInterface.addIndex('purchases', ['userId'], {
      name: 'purchases_userId_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('purchases', 'purchases_userId_idx');
    await queryInterface.removeColumn('purchases', 'userId');
  },
};
