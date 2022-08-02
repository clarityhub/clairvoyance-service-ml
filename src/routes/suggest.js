const versionRouter = require('express-version-route');
const authMiddleware = require('service-claire/middleware/auth');
const makeMap = require('service-claire/helpers/makeMap');
const cors = require('cors');

const elasticMiddleware = require('../middleware/elastic');
const v1_0 = require('../v1_0/controllers/suggest');

module.exports = function (router) {
  router.route('/suggest/search')
    .all(
      cors(),
      authMiddleware,
      elasticMiddleware
    )
    .options(cors())
    .post(versionRouter.route(makeMap({
      '1.0': v1_0.suggestResponse,
      default: v1_0.suggestResponse,
    })));

  router.route('/suggest/')
    .all(
      cors(),
      authMiddleware,
      elasticMiddleware
    )
    .options(cors())
    .post(versionRouter.route(makeMap({
      '1.0': v1_0.createResponse,
      default: v1_0.createResponse,
    })));

  router.route('/suggest/:uuid')
    .all(
      cors(),
      authMiddleware,
      elasticMiddleware
    )
    .options(cors())
    .get(versionRouter.route(makeMap({
      '1.0': v1_0.suggestResponseResponse,
      default: v1_0.suggestResponseResponse,
    })))
    .post(versionRouter.route(makeMap({
      '1.0': v1_0.createResponseResponse,
      default: v1_0.createResponseResponse,
    })));

  router.route('/suggest/:uuid/improve')
    .all(
      cors(),
      authMiddleware,
      elasticMiddleware
    )
    .options(cors())
    .post(versionRouter.route(makeMap({
      '1.0': v1_0.improve,
      default: v1_0.improve,
    })));

  router.route('/suggest/:uuid/lessen')
    .all(
      cors(),
      authMiddleware,
      elasticMiddleware
    )
    .options(cors())
    .post(versionRouter.route(makeMap({
      '1.0': v1_0.lessen,
      default: v1_0.lessen,
    })));
};
