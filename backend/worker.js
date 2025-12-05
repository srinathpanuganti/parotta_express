const { Worker } = require('bullmq');
const { sendOrderEmails } = require('./email');
const { getRedisConnection } = require('./queue');

const connection = getRedisConnection();

// Process email jobs
const worker = new Worker(
  'email',
  async (job) => {
    if (job.name === 'sendOrderEmail') {
      const { order, user, items } = job.data || {};
      if (!order || !items) return;
      await sendOrderEmails({ order, user, items });
      return { ok: true };
    }
  },
  { connection, concurrency: 5 },
);

worker.on('ready', () => {
  // eslint-disable-next-line no-console
  console.log('[worker] email worker ready');
});

worker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.warn('[worker] job failed', job?.id, err?.message);
});

