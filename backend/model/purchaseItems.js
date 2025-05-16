/**
 * PurchaseItem Model
 *
 * Represents a line item in a purchase.
 * Links a purchase to a product with quantity.
 *
 * Indexes:
 * - purchaseId: For loading items by purchase
 * - productId: For finding purchases containing a product
 * - purchaseId + productId: For duplicate checking
 */
module.exports = (sequelize, DataTypes) => {
  const PurchaseItem = sequelize.define(
    'purchaseItems',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1,
        },
        comment: 'Number of items purchased',
      },
      purchaseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Parent purchase ID',
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Product being purchased',
      },
    },
    {
      tableName: 'purchase_items', // <-- FIX: Explicit table name!
      timestamps: false,
      indexes: [
        {
          name: 'idx_purchase_items_purchase_id',
          fields: ['purchaseId'],
        },
        {
          name: 'idx_purchase_items_product_id',
          fields: ['productId'],
        },
        {
          name: 'idx_purchase_items_purchase_product',
          fields: ['purchaseId', 'productId'],
        },
      ],
    },
  );

  PurchaseItem.associate = models => {
    PurchaseItem.belongsTo(models.purchases, {
      foreignKey: 'purchaseId',
      as: 'purchase',
      onDelete: 'CASCADE',
    });

    PurchaseItem.belongsTo(models.products, {
      foreignKey: 'productId',
      as: 'product',
      onDelete: 'RESTRICT',
    });
  };

  /**
   * Scope for eager loading with product details
   */
  PurchaseItem.addScope('withProduct', {
    include: [
      {
        association: 'product',
        attributes: ['id', 'name', 'price'],
      },
    ],
  });

  return PurchaseItem;
};
