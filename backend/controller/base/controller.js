const baseService = require('./service');

module.exports = (model, includeList = []) => {
  const service = baseService(model, includeList);

  return {
    async findAll(req, res, next) {
      try {
        const entities = await service.findAll();
        res.status(200).json(entities);
      } catch (error) {
        next(error);
      }
    },

    async findOne(req, res, next) {
      try {
        const entity = await service.findOne(req.params.id);
        res.status(200).json(entity);
      } catch (error) {
        next(error);
      }
    },

    async findRandom(req, res, next) {
      try {
        const limit = parseInt(req.query.limit, 10) || 6;
        const entities = await service.findRandom(limit);
        res.status(200).json(entities);
      } catch (error) {
        next(error);
      }
    },

    async update(req, res, next) {
      try {
        const entity = await service.update(req.params.id, req.body);
        res.status(200).json(entity);
      } catch (error) {
        next(error);
      }
    },

    async create(req, res, next) {
      try {
        const entity = await service.create(req.body);
        res.status(201).json(entity);
      } catch (error) {
        next(error);
      }
    },

    async delete(req, res, next) {
      try {
        const result = await service.delete(req.params.id);
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    },
  };
};
