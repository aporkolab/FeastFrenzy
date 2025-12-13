const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const createError = require('http-errors');
const db = require('../../model');
const { validateBody } = require('../../middleware/validation');
const { authSchemas } = require('../../middleware/validation/schemas');
const { authenticate } = require('../../middleware/auth');


const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCKOUT_TIME = parseInt(process.env.LOCKOUT_TIME) || 15; 
const PASSWORD_RESET_EXPIRES = parseInt(process.env.PASSWORD_RESET_EXPIRES_IN) || 60; 


const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  
  const refreshPayload = {
    ...payload,
    tokenId: crypto.randomBytes(16).toString('hex'),
  };

  const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};


router.post(
  '/register',
  validateBody(authSchemas.register),
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      
      const existingUser = await db.users.findByEmail(email);
      if (existingUser) {
        throw createError(409, 'Email already registered');
      }

      
      const user = await db.users.create({
        name,
        email: email.toLowerCase(),
        password,
        role: 'employee', 
      });

      
      const tokens = generateTokens(user);

      
      await user.update({ refreshToken: tokens.refreshToken });

      res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        tokens,
      });
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  '/login',
  validateBody(authSchemas.login),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      
      const user = await db.users.findByEmail(email);

      
      const invalidCredentialsError = createError(401, 'Invalid credentials');

      if (!user) {
        throw invalidCredentialsError;
      }

      
      if (user.isLocked()) {
        const lockoutEnd = new Date(user.lockoutUntil);
        const minutesRemaining = Math.ceil((lockoutEnd - new Date()) / 60000);
        throw createError(
          423,
          `Account locked. Try again in ${minutesRemaining} minute(s)`
        );
      }

      
      if (!user.isActive) {
        throw createError(401, 'Account is deactivated');
      }

      
      const isValid = await user.validatePassword(password);

      if (!isValid) {
        
        const newAttempts = user.failedLoginAttempts + 1;
        const updateData = { failedLoginAttempts: newAttempts };

        
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          updateData.lockoutUntil = new Date(Date.now() + LOCKOUT_TIME * 60 * 1000);
          updateData.failedLoginAttempts = 0;
        }

        await user.update(updateData);
        throw invalidCredentialsError;
      }

      
      await user.update({
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLogin: new Date(),
      });

      
      const tokens = generateTokens(user);

      
      await user.update({ refreshToken: tokens.refreshToken });

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        tokens,
      });
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  '/refresh',
  validateBody(authSchemas.refreshToken),
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      } catch (err) {
        throw createError(401, 'Invalid or expired refresh token');
      }

      
      const user = await db.users.findByPk(decoded.id);

      if (!user || user.refreshToken !== refreshToken) {
        throw createError(401, 'Invalid refresh token');
      }

      if (!user.isActive) {
        throw createError(401, 'Account is deactivated');
      }

      
      const tokens = generateTokens(user);

      
      await user.update({ refreshToken: tokens.refreshToken });

      res.json(tokens);
    } catch (error) {
      next(error);
    }
  }
);


router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const user = await db.users.findByPk(req.user.id);

    if (user) {
      await user.update({ refreshToken: null });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});


router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await db.users.findByPk(req.user.id);

    if (!user) {
      throw createError(404, 'User not found');
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});


router.post(
  '/forgot-password',
  validateBody(authSchemas.forgotPassword),
  async (req, res, next) => {
    try {
      const { email } = req.body;

      
      
      const successMessage = { message: 'If email exists, reset link sent' };

      const user = await db.users.findByEmail(email);

      if (!user) {
        
        return res.json(successMessage);
      }

      
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      
      await user.update({
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + PASSWORD_RESET_EXPIRES * 60 * 1000),
      });

      
      
      console.log('='.repeat(60));
      console.log('PASSWORD RESET TOKEN (would be sent via email):');
      console.log(`User: ${user.email}`);
      console.log(`Token: ${resetToken}`);
      console.log(`Expires: ${new Date(Date.now() + PASSWORD_RESET_EXPIRES * 60 * 1000)}`);
      console.log('='.repeat(60));

      res.json(successMessage);
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  '/reset-password',
  validateBody(authSchemas.resetPassword),
  async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;

      
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      
      const user = await db.users.findOne({
        where: {
          passwordResetToken: hashedToken,
        },
      });

      if (!user) {
        throw createError(400, 'Invalid or expired reset token');
      }

      
      if (new Date() > new Date(user.passwordResetExpires)) {
        throw createError(400, 'Reset token has expired');
      }

      
      await user.update({
        password: newPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        refreshToken: null, 
      });

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
