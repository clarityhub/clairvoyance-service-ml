const express = require('express');
const bodyParser = require('body-parser');

const limits = require('./rate-limits');
const routes = require('./routes/index');
require('./v1_0/subscriptions');
const { settings } = require('service-claire/helpers/config');
const helmet = require('service-claire/middleware/helmet');
const errorHandler = require('service-claire/middleware/errors');
const logger = require('service-claire/helpers/logger');

logger.register('7d37a6c7053ca8b44dc4c68b4e7ca512');

const app = express();

app.enable('trust proxy');
app.use(helmet());
app.use(bodyParser.json());
app.use(limits);
app.use('/recommend', routes);
app.use(errorHandler);

const server = app.listen(
  settings.port,
  () => logger.log(`✅ 🤖 service-recommend-templates running on port ${settings.port}`)
);

module.exports = { app, server }; // For testing
