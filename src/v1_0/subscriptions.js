const { connect } = require('service-claire/services/pubsub');

const exchange = `${process.env.NODE_ENV || 'development'}.template`;

const subscribe = async function () {
  const connection = await connect;
  const ch = await connection.createChannel();

  ch.assertExchange(exchange, 'fanout', { durable: false });

  const q = await ch.assertQueue('');
  const ok = await ch.bindQueue(q.queue, exchange, '');

  ch.consume(q.queue, (msg) => {
    const message = JSON.parse(msg.content.toString());

    switch (message.event) {
      // XXX
      default:
      // Do nothing
    }
  }, { noAck: true });

  return ok;
};

subscribe();
