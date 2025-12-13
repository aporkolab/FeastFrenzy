const { v4: uuidv4 } = require('uuid');

const REQUEST_ID_HEADER = 'x-request-id';

function requestIdMiddleware(req, res, next) {
  const requestId = req.get(REQUEST_ID_HEADER) || uuidv4();

  req.id = requestId;

  res.setHeader('X-Request-ID', requestId);

  next();
}

function getRequestId(req) {
  return req?.id;
}

module.exports = {
  requestIdMiddleware,
  getRequestId,
  REQUEST_ID_HEADER,
};
