import { env } from './infra/config/env';
import { buildContainer } from './infra/container';
import { createApp } from './interfaces/http/server';

const app = createApp(buildContainer());

app.listen(env.PORT, () => {
  console.log(`[ergane-pagamentos] escutando em http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
