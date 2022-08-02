const Elastic = require('../services/Elastic');

const elasticMiddleware = (req, res, next) => {
  if (req.services) {
    req.services.elastic = Elastic.client;
  } else {
    req.services = {
      elastic: Elastic.client,
    };
  }

  next();
};

module.exports = elasticMiddleware;
