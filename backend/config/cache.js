/**
 * Cache Configuration
 *
 * TTL (Time To Live) settings for different resources
 * Values are in seconds
 *
 * Guidelines:
 * - Frequently changing data: shorter TTL (60-300s)
 * - Relatively stable data: longer TTL (300-900s)
 * - Reference/lookup data: even longer TTL (900-3600s)
 */

const SECONDS = 1;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

module.exports = {
  // Product cache settings
  products: {
    list: 5 * MINUTES, // Product listings - moderate TTL
    single: 5 * MINUTES, // Single product details
    search: 2 * MINUTES, // Search results - shorter TTL for relevance
  },

  // Employee cache settings
  employees: {
    list: 10 * MINUTES, // Employee listings - less frequently updated
    single: 10 * MINUTES, // Single employee details
  },

  // Purchase cache settings
  purchases: {
    list: 1 * MINUTES, // Purchase listings - frequently changing
    single: 1 * MINUTES, // Single purchase - may have items added
    userPurchases: 1 * MINUTES, // User-specific purchases
  },

  // Purchase items cache settings
  purchaseItems: {
    list: 1 * MINUTES, // Items can be added/removed frequently
    single: 2 * MINUTES,
  },

  // Audit logs - can have longer TTL as they're immutable
  auditLogs: {
    list: 15 * MINUTES,
    single: 30 * MINUTES,
  },

  // User-related cache
  users: {
    list: 2 * MINUTES, // User list - admin only, moderate TTL
    single: 2 * MINUTES, // Single user details
    profile: 5 * MINUTES,
    permissions: 5 * MINUTES,
  },

  // System/reference data
  system: {
    health: 30 * SECONDS, // Health check - very short TTL
    stats: 1 * MINUTES, // Statistics
  },

  // Default TTL for unspecified resources
  default: 5 * MINUTES,

  // Cache key patterns for invalidation
  patterns: {
    products: {
      all: 'products:*',
      single: (id) => `product:*id=${id}*`,
    },
    employees: {
      all: 'employees:*',
      single: (id) => `employee:*id=${id}*`,
    },
    purchases: {
      all: 'purchases:*',
      single: (id) => `purchase:*id=${id}*`,
      byUser: (userId) => `purchases:*userId=${userId}*`,
    },
    purchaseItems: {
      all: 'purchase-items:*',
      byPurchase: (purchaseId) => `purchase-items:*purchaseId=${purchaseId}*`,
    },
    auditLogs: {
      all: 'audit-logs:*',
    },
    users: {
      all: 'users:*',
      single: (id) => `user:*id=${id}*`,
    },
  },
};
