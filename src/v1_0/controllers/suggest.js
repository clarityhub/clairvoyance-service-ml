const { ok, badRequest, error } = require('service-claire/helpers/responses');
const logger = require('service-claire/helpers/logger');
const stopWords = require('../stopWords');
const {
  Request,
  Response,
  sequelize,
} = require('../../models');
const {
  REQUEST,
  RESPONSE,
} = require('../../constants/responseParentTypes');

const db = process.env.NODE_ENV || 'development';

// XXX make sure there is a type filter on call queries
// TODO make weights matter
// TODO add response changes to the elastic search
// and make the suggestResponseResponse use the response
// entries for prediction as well

/**
 * Given a request chain, suggest at most 3 responses
 *
 * @apiParam {String} text
 * @apiParam {String} type One of email, chat, etc
 * @apiParam {Number} limit (Optional) A number between 1 and 10, defaults to 3
 */
const suggestResponse = (req, res) => {
  const { text, type, limit: suggestedLimit } = req.body;
  const { accountId } = req.user;
  const limit = Math.max(1, Math.min(10, suggestedLimit || 3));

  if (!text) {
    return badRequest(res)({
      reason: 'Text is required',
    });
  }

  if (!type) {
    return badRequest(res)({
      reason: 'A type is required',
    });
  }

  req.services.elastic.search({
    index: `${db}_requests`,
    size: 10, // Default to 10
    body: {
      query: {
        bool: {
          must: [
            { match: { accountId } },
            { match: { type } },
            {
              // TODO also score on match frequency
              more_like_this: {
                fields: ['text'],
                like_text: text,
                min_doc_freq: 1,
                min_term_freq: 1,
                stop_words: stopWords,
              },
            },
          ],
        },
      },
    },
  }).then((data) => {
    // Get the documents to postgres
    const requestIds = data.hits.hits.map(h => h._source.requestId);

    if (requestIds.length === 0) {
      ok(res)({
        total: 0,
        results: [],
      });

      return;
    }

    // TODO use the cool sequelize.cast stuff
    // TODO fix query to ignore deletedAt
    return Request.sequelize.query(
      `
        SELECT * FROM "Requests"
        WHERE
          id = ANY('{${requestIds.slice(0, limit).join(',')}}'::int[])
          AND "accountId" = ?
      `,
      {
        replacements: [
          accountId,
        ],
        type: Request.sequelize.QueryTypes.SELECT,
        logging: false,
        model: Request,
      }
    ).then((requests) => {
      Response.findAll({
        order: [['weight', 'DESC']],
        where: {
          weight: {
            $gte: 0,
          },
          parentType: REQUEST,
          parentId: {
            $any: sequelize.cast(requests.map(r => r.id), 'int[]'),
          },
        },
        attributes: Response.cleanAttributes,
      }).then((responses) => {
        ok(res)({
          total: responses.length,
          results: responses,
        });
      });
    });
  }).catch((err) => {
    logger.error(err);
    error(res)(err);
  });
};

/**
 * Given a request chain, add a new response suggestion
 */
const createResponse = (req, res) => {
  const { type, requestText, responseText } = req.body;
  const { userId, accountId } = req.user;

  // XXX requestText, responseText and type are required

  // XXX DO NOT CREATE A NEW REQUEST OR ELASTIC ENTRY IF THERE
  // IS AN EXACT REQUEST_TEXT MATCH
  return sequelize.transaction((t) => {
    return Request.create({
      type,
      text: requestText,
      accountId,
      creatorId: userId,
    }, {
      returning: true,
      transaction: t,
    }).then((request) => {
      return Response.create({
        text: responseText,
        parentId: request.id,
        parentType: REQUEST,
        weight: 1,
        accountId,
        creatorId: userId,
      }, {
        returning: true,
        transaction: t,
      }).then((response) => {
        // Add to elastic search
        req.services.elastic.create({
          index: `${db}_requests`,
          id: request.id,
          type: REQUEST,
          body: {
            text: requestText,
            requestId: request.id,
            creatorId: userId,
            accountId,
            type,
          },
        }).then(() => {
          ok(res)({
            uuid: response.uuid,
          });
        });
      });
    }).catch((err) => {
      logger.error(err);
      error(res)(err);
    });
  });
};

/**
 * Given a response uuid, suggest at most 3 responses
 */
const suggestResponseResponse = (req, res) => {
  const { accountId } = req.user;
  const { uuid } = req.params;

  Response.findOne({
    where: {
      accountId,
      uuid,
    },
  }).then((response) => {
    if (!response) {
      ok(res)({
        total: 0,
        results: [],
      });

      return;
    }

    return Response.findAll({
      attributes: Response.cleanAttributes,
      order: [['weight', 'DESC']],
      where: {
        weight: {
          $gte: 0,
        },
        accountId,
        parentId: response.id,
        parentType: RESPONSE,
      },
    }).then((responses) => {
      ok(res)({
        total: responses.length,
        results: responses,
      });
    });
  }).catch((err) => {
    logger.error(err);
    error(res)(err);
  });
};

/**
 * Given a response uuid, add a new response suggestion
 */
const createResponseResponse = (req, res) => {
  const { accountId, userId } = req.user;
  const { uuid } = req.params;
  const { responseText, type } = req.body;

  Response.findOne({
    where: {
      accountId,
      uuid,
    },
  }).then((response) => {
    return Response.create({
      text: responseText,
      parentId: response.id,
      parentType: RESPONSE,
      weight: 1,
      accountId,
      creatorId: userId,
      type,
    }, {
      returning: true,
    }).then((newResponse) => {
      ok(res)({
        done: true,
        uuid: newResponse.uuid,
      });
    });
  }).catch(error(res));
};

const improve = (req, res) => {
  const { uuid } = req.params;
  const { from, type } = req.body;
  const { accountId } = req.user;

  if (type === 'request-response') {
    Response.update({
      weight: sequelize.literal('weight + 1'),
    }, {
      where: {
        uuid,
        accountId,
        parentType: REQUEST,
      },
    }).then(() => {
      ok(res)({
        done: true,
      });
    }).catch(error(res));
  } else {
    Response.findOne({
      where: {
        accountId,
        uuid: from,
      },
    }).then((response) => {
      return Response.update({
        weight: sequelize.literal('weight + 1'),
      }, {
        where: {
          uuid,
          accountId,
          parentId: response.id,
          parentType: RESPONSE,
        },
        returning: true,
      }).then((newResponse) => {
        ok(res)({
          done: true,
          uuid: newResponse.uuid,
        });
      });
    }).catch((err) => {
      logger.error(err);
      error(res)(err);
    });
  }
};

const lessen = (req, res) => {
  const { uuid } = req.params;
  const { from, type } = req.body;
  const { accountId } = req.user;

  if (type === 'request-response') {
    Response.update({
      weight: sequelize.literal('weight - 1'),
    }, {
      where: {
        uuid,
        accountId,
        parentType: REQUEST,
      },
    }).then(() => {
      ok(res)({
        done: true,
      });
    }).catch((err) => {
      logger.error(err);
      error(res)(err);
    });
  } else {
    Response.findOne({
      where: {
        accountId,
        uuid: from,
      },
    }).then((response) => {
      return Response.update({
        weight: sequelize.literal('weight - 1'),
      }, {
        where: {
          uuid,
          accountId,
          parentId: response.id,
          parentType: RESPONSE,
        },
      }).then(() => {
        ok(res)({
          done: true,
        });
      });
    }).catch((err) => {
      logger.error(err);
      error(res)(err);
    });
  }
};

module.exports = {
  suggestResponse,
  createResponse,
  suggestResponseResponse,
  createResponseResponse,
  improve,
  lessen,
};
