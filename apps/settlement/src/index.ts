import { buildApp } from './app';
import { config } from './config';
import { logger } from './logger';

const app = buildApp();
app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'settlement_listening');
});
