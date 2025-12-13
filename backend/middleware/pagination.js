

const paginate = (defaultLimit = 20, maxLimit = 100) => {
  return (req, res, next) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const requestedLimit = parseInt(req.query.limit, 10) || defaultLimit;
    const limit = Math.min(maxLimit, Math.max(1, requestedLimit));
    const skip = (page - 1) * limit;

    req.pagination = {
      page,
      limit,
      skip,
    };

    next();
  };
};

module.exports = { paginate };
