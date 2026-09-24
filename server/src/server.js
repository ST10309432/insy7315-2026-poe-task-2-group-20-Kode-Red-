const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`Thabang Phala API listening on port ${env.port} (${env.nodeEnv})`);
});
