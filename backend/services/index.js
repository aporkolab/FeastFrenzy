/**
 * Services Index
 *
 * Centralized export of all service modules.
 * Services provide optimized database operations with:
 * - Eager loading to prevent N+1 queries
 * - Transaction management for multi-table operations
 * - Consistent error handling
 * - Bulk operations support
 */

const employeeService = require('./employee.service');
const productService = require('./product.service');
const purchaseService = require('./purchase.service');
const purchaseItemService = require('./purchaseItem.service');
const userService = require('./user.service');

module.exports = {
  employeeService,
  productService,
  purchaseService,
  purchaseItemService,
  userService,
};
