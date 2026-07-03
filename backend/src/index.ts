import app from './app';
import { config } from './config';

app.listen(config.port, config.host, () => {
  console.log(`\n  ✦ SalonHub API rodando em http://0.0.0.0:${config.port}`);
  console.log(`  ✦ Health check: http://localhost:${config.port}/health`);
  console.log(`  ✦ Ambiente: ${config.nodeEnv}\n`);
});
