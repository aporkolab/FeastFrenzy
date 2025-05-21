const { Sequelize } = require('sequelize');
const createError = require('http-errors');

module.exports = (model, includeList = []) => {
  const modelName = model.name || 'Entity';

  return {
    async findAll() {
      try {
        return await model.findAll({
          include: includeList,
          order: [['id', 'ASC']],
        });
      } catch (error) {
        throw createError(
          500,
          `Failed to retrieve ${modelName} list: ${error.message}`,
        );
      }
    },

    async findOne(id) {
      try {
        const entity = await model.findOne({
          where: { id },
          include: includeList,
        });

        if (!entity) {
          throw createError(404, `${modelName} with ID ${id} not found`);
        }

        return entity;
      } catch (error) {
        if (error.status === 404) {
          throw error;
        }
        throw createError(
          500,
          `Failed to retrieve ${modelName}: ${error.message}`,
        );
      }
    },

    async findRandom(limit = 6) {
      try {
        return await model.findAll({
          order: Sequelize.literal('RAND()'),
          limit,
          include: includeList,
        });
      } catch (error) {
        throw createError(
          500,
          `Failed to retrieve random ${modelName}: ${error.message}`,
        );
      }
    },

    async update(id, updateData) {
      try {
        const entity = await model.findByPk(id);

        if (!entity) {
          throw createError(404, `${modelName} with ID ${id} not found`);
        }

        await entity.update(updateData);
        return await model.findByPk(id, { include: includeList });
      } catch (error) {
        if (error.status === 404) {
          throw error;
        }
        if (error.name === 'SequelizeValidationError') {
          const messages = error.errors.map(e => e.message).join(', ');
          throw createError(400, `Validation failed: ${messages}`);
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
          throw createError(409, `${modelName} with this value already exists`);
        }
        throw createError(
          500,
          `Failed to update ${modelName}: ${error.message}`,
        );
      }
    },

    async create(data) {
      try {
        const created = await model.create(data);
        return await model.findByPk(created.id, { include: includeList });
      } catch (error) {
        if (error.name === 'SequelizeValidationError') {
          const messages = error.errors.map(e => e.message).join(', ');
          throw createError(400, `Validation failed: ${messages}`);
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
          throw createError(409, `${modelName} with this value already exists`);
        }
        throw createError(
          500,
          `Failed to create ${modelName}: ${error.message}`,
        );
      }
    },

    async delete(id) {
      try {
        const entity = await model.findByPk(id);

        if (!entity) {
          throw createError(404, `${modelName} with ID ${id} not found`);
        }

        await entity.destroy();
        return { deleted: true, id };
      } catch (error) {
        if (error.status === 404) {
          throw error;
        }
        throw createError(
          500,
          `Failed to delete ${modelName}: ${error.message}`,
        );
      }
    },
  };
};
