const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'users',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Primary key',
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
        comment: 'Unique email address, indexed for login lookups',
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Bcrypt hashed password',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Display name',
      },
      role: {
        type: DataTypes.ENUM('admin', 'manager', 'employee'),
        allowNull: false,
        defaultValue: 'employee',
        comment: 'User role for authorization, indexed for role-based queries',
      },
      refreshToken: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'JWT refresh token for session management',
      },
      passwordResetToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Token for password reset flow',
      },
      passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Expiration time for password reset token',
      },
      failedLoginAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Counter for failed login attempts',
      },
      lockoutUntil: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Account lockout expiration, indexed for lockout queries',
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last successful login timestamp, indexed for activity reports',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Soft delete flag, indexed for active user queries',
      },
    },
    {
      timestamps: true,
      hooks: {
        beforeCreate: async user => {
          if (user.password) {
            const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            user.password = await bcrypt.hash(user.password, rounds);
          }
        },
        beforeUpdate: async user => {
          if (user.changed('password')) {
            const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            user.password = await bcrypt.hash(user.password, rounds);
          }
        },
      },
      // Index definitions
      indexes: [
        // Role-based queries
        {
          name: 'idx_users_role',
          fields: ['role'],
        },
        // Active status queries
        {
          name: 'idx_users_isActive',
          fields: ['isActive'],
        },
        // Combined role + active for filtered user lists
        {
          name: 'idx_users_role_isActive',
          fields: ['role', 'isActive'],
        },
        // Last login for activity reports
        {
          name: 'idx_users_lastLogin',
          fields: ['lastLogin'],
        },
        // Lockout queries
        {
          name: 'idx_users_lockoutUntil',
          fields: ['lockoutUntil'],
        },
      ],
      // Scopes for common queries
      scopes: {
        // Active users only
        active: {
          where: { isActive: true },
        },
        // Inactive users (soft deleted)
        inactive: {
          where: { isActive: false },
        },
        // Currently locked out
        locked: {
          where: {
            lockoutUntil: {
              [Op.gt]: new Date(),
            },
          },
        },
        // By role
        admins: {
          where: { role: 'admin' },
        },
        managers: {
          where: { role: 'manager' },
        },
        employees: {
          where: { role: 'employee' },
        },
        // Without sensitive fields (for API responses)
        safe: {
          attributes: {
            exclude: ['password', 'refreshToken', 'passwordResetToken', 'passwordResetExpires'],
          },
        },
        // Recently active (logged in within last 30 days)
        recentlyActive: {
          where: {
            lastLogin: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    },
  );

  // Instance methods
  User.prototype.validatePassword = async function (password) {
    return bcrypt.compare(password, this.password);
  };

  User.prototype.isLocked = function () {
    if (!this.lockoutUntil) {
      return false;
    }
    return new Date() < new Date(this.lockoutUntil);
  };

  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    delete values.refreshToken;
    delete values.passwordResetToken;
    delete values.passwordResetExpires;
    return values;
  };

  // Class methods
  User.findByEmail = function (email) {
    return this.findOne({ where: { email: email.toLowerCase() } });
  };

  // Association setup (called from model/index.js)
  User.associate = models => {
    User.hasMany(models.purchases, {
      foreignKey: 'userId',
      as: 'purchases',
    });

    User.hasMany(models.audit_logs, {
      foreignKey: 'userId',
      as: 'auditLogs',
    });
  };

  return User;
};
