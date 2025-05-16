/**
 * Purchase Model
 *
 * Represents a purchase transaction in the system.
 * Each purchase belongs to an employee and optionally a user (for ownership tracking).
 *
 * NOTE: Employee association uses { paranoid: false } to include soft-deleted employees
 * This ensures purchases remain visible with their employee info for audit trail.
 *
 * Indexes:
 * - employeeId: For filtering by employee
 * - userId: For ownership-based queries
 * - date: For date range queries (most common filter)
 * - closed: For open/closed status filtering
 * - employeeId + date: Composite for employee reports
 * - userId + closed: Composite for "my open purchases"
 * - closed + date: Composite for admin dashboards
 */
module.exports = (sequelize, DataTypes) => {
  const Purchase = sequelize.define(
    'purchases',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Purchase date and time',
      },
      closed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the purchase is finalized',
      },
      total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Total purchase amount',
      },
      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Employee making the purchase',
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'User who created this purchase (for ownership)',
      },
    },
    {
      timestamps: false,
      indexes: [
        // Single-column indexes for common filters
        {
          name: 'idx_purchases_employee_id',
          fields: ['employeeId'],
        },
        {
          name: 'idx_purchases_user_id',
          fields: ['userId'],
        },
        {
          name: 'idx_purchases_date',
          fields: ['date'],
        },
        {
          name: 'idx_purchases_closed',
          fields: ['closed'],
        },
        // Composite indexes for common query patterns
        {
          name: 'idx_purchases_employee_date',
          fields: ['employeeId', 'date'],
        },
        {
          name: 'idx_purchases_user_closed',
          fields: ['userId', 'closed'],
        },
        {
          name: 'idx_purchases_closed_date',
          fields: ['closed', 'date'],
        },
      ],
    },
  );

  Purchase.associate = function (models) {
    // A purchase has many items
    Purchase.hasMany(models.purchaseItems, {
      foreignKey: 'purchaseId',
      as: 'purchaseItems',
      onDelete: 'CASCADE',
    });

    // A purchase belongs to an employee
    // NOTE: No onDelete - we want to keep purchase even if employee is soft-deleted
    Purchase.belongsTo(models.employees, {
      foreignKey: 'employeeId',
      as: 'employee',
    });

    // A purchase optionally belongs to a user (for ownership)
    Purchase.belongsTo(models.users, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  /**
   * Scope for eager loading with employee
   * Uses paranoid: false to include soft-deleted employees
   */
  Purchase.addScope('withEmployee', {
    include: [
      {
        association: 'employee',
        attributes: ['id', 'name', 'employee_number', 'deletedAt'],
        paranoid: false, // Include soft-deleted employees!
      },
    ],
  });

  /**
   * Scope for eager loading with items and products
   */
  Purchase.addScope('withItems', {
    include: [
      {
        association: 'purchaseItems',
        include: [
          {
            association: 'product',
            attributes: ['id', 'name', 'price'],
          },
        ],
      },
    ],
  });

  /**
   * Scope for full eager loading (employee + items + products)
   * Uses paranoid: false for employee to include soft-deleted
   */
  Purchase.addScope('full', {
    include: [
      {
        association: 'employee',
        attributes: ['id', 'name', 'employee_number', 'deletedAt'],
        paranoid: false, // Include soft-deleted employees!
      },
      {
        association: 'purchaseItems',
        include: [
          {
            association: 'product',
            attributes: ['id', 'name', 'price'],
          },
        ],
      },
    ],
  });

  /**
   * Scope for open purchases only
   */
  Purchase.addScope('open', {
    where: { closed: false },
  });

  /**
   * Scope for closed purchases only
   */
  Purchase.addScope('closed', {
    where: { closed: true },
  });

  return Purchase;
};
