/**
 * Product Model
 *
 * Represents a product available for purchase.
 *
 * Indexes:
 * - name: Unique identifier for lookups and search
 * - price: For price range queries and sorting
 */
module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'products',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Product name',
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
        comment: 'Product price',
      },
    },
    {
      timestamps: false,
      indexes: [
        {
          name: 'idx_products_name',
          fields: ['name'],
          unique: true,
        },
        {
          name: 'idx_products_price',
          fields: ['price'],
        },
      ],
    },
  );

  Product.associate = function (models) {
    Product.hasMany(models.purchaseItems, {
      foreignKey: 'productId',
      as: 'purchaseItems',
    });
  };

  /**
   * Scope for eager loading with purchase items
   */
  Product.addScope('withPurchaseItems', {
    include: [
      {
        association: 'purchaseItems',
        attributes: ['id', 'quantity', 'purchaseId'],
      },
    ],
  });

  return Product;
};
