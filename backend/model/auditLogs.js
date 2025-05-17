/**
 * AuditLog Model
 *
 * Tracks all significant actions in the system for security
 * and compliance purposes. Every CREATE, UPDATE, DELETE,
 * LOGIN, LOGOUT, and PASSWORD_RESET is logged here.
 *
 * Think of it as the "who did what and when" black box.
 */

module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    'audit_logs',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true, // null for system actions or failed logins
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'User who performed the action (null for system actions)',
      },
      action: {
        type: DataTypes.ENUM(
          'CREATE',
          'UPDATE',
          'DELETE',
          'LOGIN',
          'LOGOUT',
          'LOGIN_FAILED',
          'PASSWORD_RESET',
        ),
        allowNull: false,
        comment: 'Type of action performed',
      },
      resource: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Resource type: product, employee, purchase, user, auth',
      },
      resourceId: {
        type: DataTypes.INTEGER,
        allowNull: true, // null for auth actions
        comment: 'ID of the affected resource',
      },
      oldValue: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Previous state for UPDATE/DELETE actions',
      },
      newValue: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'New state for CREATE/UPDATE actions',
      },
      ipAddress: {
        type: DataTypes.STRING(45), // IPv6 can be up to 45 chars
        allowNull: true,
        comment: 'Client IP address',
      },
      userAgent: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Client user agent string',
      },
      requestId: {
        type: DataTypes.STRING(36), // UUID format
        allowNull: true,
        comment: 'Request correlation ID for tracing',
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When the action occurred',
      },
    },
    {
      timestamps: false, // We have our own timestamp field
      indexes: [
        {
          name: 'audit_logs_user_id_idx',
          fields: ['userId'],
        },
        {
          name: 'audit_logs_action_idx',
          fields: ['action'],
        },
        {
          name: 'audit_logs_resource_idx',
          fields: ['resource'],
        },
        {
          name: 'audit_logs_resource_id_idx',
          fields: ['resourceId'],
        },
        {
          name: 'audit_logs_timestamp_idx',
          fields: ['timestamp'],
        },
        {
          name: 'audit_logs_request_id_idx',
          fields: ['requestId'],
        },
        // Composite index for common queries
        {
          name: 'audit_logs_user_action_timestamp_idx',
          fields: ['userId', 'action', 'timestamp'],
        },
      ],
    },
  );

  // Association setup
  AuditLog.associate = models => {
    AuditLog.belongsTo(models.users, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'SET NULL', // Keep audit logs even if user is deleted
    });
  };

  /**
   * Sanitize sensitive data before logging
   * Never log passwords, tokens, or other secrets!
   */
  AuditLog.sanitizeValue = value => {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const sensitiveFields = [
      'password',
      'refreshToken',
      'passwordResetToken',
      'accessToken',
      'token',
      'secret',
    ];

    const sanitized = { ...value };

    sensitiveFields.forEach(field => {
      if (sanitized[field] !== undefined) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  };

  return AuditLog;
};
