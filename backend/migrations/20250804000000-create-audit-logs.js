'use strict';

/**
 * Migration: Create audit_logs table
 *
 * This table is the compliance officer's wet dream.
 * Every significant action gets logged here for posterity.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL', // Keep logs even if user is deleted
        comment: 'User who performed the action',
      },
      action: {
        type: Sequelize.ENUM(
          'CREATE',
          'UPDATE',
          'DELETE',
          'LOGIN',
          'LOGOUT',
          'LOGIN_FAILED',
          'PASSWORD_RESET'
        ),
        allowNull: false,
        comment: 'Type of action performed',
      },
      resource: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Resource type affected',
      },
      resourceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID of the affected resource',
      },
      oldValue: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Previous state for UPDATE/DELETE',
      },
      newValue: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'New state for CREATE/UPDATE',
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'Client IP address (IPv6 compatible)',
      },
      userAgent: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Client user agent',
      },
      requestId: {
        type: Sequelize.STRING(36),
        allowNull: true,
        comment: 'Request correlation ID',
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When the action occurred',
      },
    });

    // Create indexes for common query patterns
    await queryInterface.addIndex('audit_logs', ['userId'], {
      name: 'audit_logs_user_id_idx',
    });

    await queryInterface.addIndex('audit_logs', ['action'], {
      name: 'audit_logs_action_idx',
    });

    await queryInterface.addIndex('audit_logs', ['resource'], {
      name: 'audit_logs_resource_idx',
    });

    await queryInterface.addIndex('audit_logs', ['resourceId'], {
      name: 'audit_logs_resource_id_idx',
    });

    await queryInterface.addIndex('audit_logs', ['timestamp'], {
      name: 'audit_logs_timestamp_idx',
    });

    await queryInterface.addIndex('audit_logs', ['requestId'], {
      name: 'audit_logs_request_id_idx',
    });

    // Composite index for "what did user X do recently" queries
    await queryInterface.addIndex('audit_logs', ['userId', 'action', 'timestamp'], {
      name: 'audit_logs_user_action_timestamp_idx',
    });

    // Composite index for "what happened to resource Y" queries
    await queryInterface.addIndex('audit_logs', ['resource', 'resourceId', 'timestamp'], {
      name: 'audit_logs_resource_timeline_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs');
  },
};
