const { Queue } = require('bullmq');

function getRedisConnection() {
  const url = process.env.REDIS_URL;
  if (url) {
    return { url };
  }
  if (!process.env.REDIS_HOST) {
    // No explicit Redis config; signal to skip queue in dev
    return null;
  }
  const host = process.env.REDIS_HOST;
  const port = Number(process.env.REDIS_PORT || 6379);
  const password = process.env.REDIS_PASSWORD || undefined;
  return { host, port, password };
}

const connection = getRedisConnection();

let emailQueue = null;
if (connection) {
  emailQueue = new Queue('email', { connection });
}

module.exports = { emailQueue, getRedisConnection };
