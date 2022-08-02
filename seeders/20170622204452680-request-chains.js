const { client } = require('../src/services/Elastic');

const db = process.env.NODE_ENV || 'development';

// TODO use a text array to seed
// to make things easier
// const texts = [
//
// ];

module.exports = {
  up(queryInterface) {
    // XXX bulk insert Responses and use their ids in the Requests
    return queryInterface.bulkInsert('Requests', [{
      creatorId: '1',
      accountId: '1',
      type: 'chat',
    }, {
      creatorId: '1',
      accountId: '1',
      type: 'chat',
    }, {
      creatorId: '1',
      accountId: '1',
      type: 'chat',
    }, {
      creatorId: '1',
      accountId: '1',
      type: 'chat',
    }, {
      creatorId: '2',
      accountId: '2',
      type: 'chat',
    }], { returning: true }).then((requests) => {
      return client.indices.putMapping({
        index: `${db}_requests`,
        type: 'request',
        body: {
          request: {
            properties: {
              text: {
                type: 'text',
                term_vector: 'yes',
              },
            },
          },
        },
      }).then(() => {
        return client.bulk({
          body: [
            { index: { _index: `${db}_requests`, _type: 'request', _id: 1 } },
            {
              text: 'I\'d like more information on your pricing.\n\nDo you charge for calling',
              requestId: requests[0].id,
              creatorId: '1',
              accountId: '1',
              type: 'chat',
            },

            { index: { _index: `${db}_requests`, _type: 'request', _id: 2 } },
            {
              text: 'Is calling part of the premium plan?',
              requestId: requests[1].id,
              creatorId: '1',
              accountId: '1',
              type: 'chat',
            },

            { index: { _index: `${db}_requests`, _type: 'request', _id: 3 } },
            {
              text: 'Hey guys. I\'m having trouble editing my header',
              requestId: requests[2].id,
              creatorId: '1',
              accountId: '1',
              type: 'chat',
            },

            { index: { _index: `${db}_requests`, _type: 'request', _id: 4 } },
            {
              text: 'Hello, I share an account with Sam, but we fired her last week\n\nThe account is under her name, can I change it to be under my name?',
              requestId: requests[3].id,
              creatorId: '1',
              accountId: '1',
              type: 'chat',
            },

            { index: { _index: `${db}_requests`, _type: 'request', _id: 5 } },
            {
              text: 'I\'d like more information on your pricing.\n\nDo you charge for calling',
              requestId: requests[4].id,
              creatorId: '2',
              accountId: '2',
              type: 'chat',
            },
          ],
        });
      });
    });
  },

  down(queryInterface) {
    return queryInterface.bulkDelete('Requests', null, {}).then(() => {
      return client.bulk({
        body: [
          { delete: { _index: `${db}_requests`, _type: 'request', _id: 1 } },

          { delete: { _index: `${db}_requests`, _type: 'request', _id: 2 } },

          { delete: { _index: `${db}_requests`, _type: 'request', _id: 3 } },

          { delete: { _index: `${db}_requests`, _type: 'request', _id: 4 } },

          { delete: { _index: `${db}_requests`, _type: 'request', _id: 5 } },
        ],
      });
    });
  },
};
