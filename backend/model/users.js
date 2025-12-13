const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'users',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('admin', 'manager', 'employee'),
        allowNull: false,
        defaultValue: 'employee',
      },
      refreshToken: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      passwordResetToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      failedLoginAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lockoutUntil: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
    }
  );

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

  User.findByEmail = function (email) {
    return this.findOne({ where: { email: email.toLowerCase() } });
  };

  return User;
};
