/**
 * Employee Model
 *
 * Represents an employee who can make purchases.
 *
 * SOFT DELETE ENABLED (paranoid mode):
 * - Employees are never physically deleted
 * - DELETE sets deletedAt timestamp instead
 * - All queries auto-filter deleted records
 * - Use { paranoid: false } to include deleted records
 *
 * Indexes:
 * - employee_number: Unique identifier for lookups
 * - name: For search/filter operations
 * - monthlyConsumptionValue: For reports and sorting
 * - deletedAt: For soft delete filtering
 */
module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define(
    'employees',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Employee full name',
      },
      employee_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Unique employee identifier',
      },
      monthlyConsumptionValue: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Monthly consumption allowance',
      },
    },
    {
      timestamps: true, // Enable createdAt and updatedAt
      paranoid: true, // Enable soft delete (adds deletedAt)
      indexes: [
        {
          name: 'idx_employees_employee_number',
          fields: ['employee_number'],
          unique: true,
        },
        {
          name: 'idx_employees_name',
          fields: ['name'],
        },
        {
          name: 'idx_employees_consumption',
          fields: ['monthlyConsumptionValue'],
        },
        {
          name: 'idx_employees_deleted_at',
          fields: ['deletedAt'],
        },
      ],
    },
  );

  Employee.associate = function (models) {
    Employee.hasMany(models.purchases, {
      foreignKey: 'employeeId',
      as: 'purchases',
    });
  };

  /**
   * Scope for eager loading with purchases
   */
  Employee.addScope('withPurchases', {
    include: [
      {
        association: 'purchases',
        attributes: ['id', 'date', 'total', 'closed'],
      },
    ],
  });

  /**
   * Scope to include deleted employees (for admin/audit)
   */
  Employee.addScope('withDeleted', {
    paranoid: false,
  });

  /**
   * Scope for only deleted employees (for restore functionality)
   */
  Employee.addScope('onlyDeleted', {
    where: {
      deletedAt: { [sequelize.Sequelize.Op.ne]: null },
    },
    paranoid: false,
  });

  return Employee;
};
