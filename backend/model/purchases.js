module.exports = (sequelize, DataTypes) => {
  const purchases = sequelize.define(
    'purchases', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      closed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
    }, {
      timestamps: false,
    });

  purchases.associate = function (models) {
    purchases.hasMany(models.purchaseItems, {
      as: 'purchaseItems',
    });
    purchases.belongsTo(models.employees, {
      as: 'employee',
    });
    purchases.belongsTo(models.users, {
      as: 'user',
      foreignKey: 'userId',
    });
  };

  return purchases;
};
