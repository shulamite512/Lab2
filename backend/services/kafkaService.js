const { Kafka } = require('kafkajs');

const brokers = (process.env.KAFKA_BROKER || 'localhost:9092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);
const clientId = process.env.KAFKA_CLIENT_ID || 'airbnb-backend';
const bookingTopic = process.env.KAFKA_BOOKING_TOPIC || 'booking-notifications';

const kafka = new Kafka({ clientId, brokers });
let producer;
let topicReadyPromise;

async function ensureTopicExists() {
  if (!topicReadyPromise) {
    topicReadyPromise = (async () => {
      const admin = kafka.admin();
      try {
        await admin.connect();
        await admin.createTopics({
          topics: [{ topic: bookingTopic, numPartitions: 1, replicationFactor: 1 }],
          waitForLeaders: true
        });
        console.log(`[Kafka] Topic ready: ${bookingTopic}`);
      } catch (error) {
        const alreadyExists = error.type === 'TOPIC_ALREADY_EXISTS' || /exists/i.test(error.message);
        if (!alreadyExists) {
          console.warn(`[Kafka] Topic creation issue for ${bookingTopic}: ${error.message}`);
        }
      } finally {
        await admin.disconnect().catch(() => {});
      }
    })();
  }
  return topicReadyPromise;
}

async function getProducer() {
  if (!producer) {
    producer = kafka.producer();
    await producer.connect();
    console.log('[Kafka] Producer connected');
  }
  return producer;
}

async function publishBookingEvent(eventPayload) {
  try {
    await ensureTopicExists();
    const activeProducer = await getProducer();
    await activeProducer.send({
      topic: bookingTopic,
      messages: [
        {
          key: String(eventPayload.bookingId || eventPayload.property_id || Date.now()),
          value: JSON.stringify({
            emittedAt: new Date().toISOString(),
            ...eventPayload
          })
        }
      ]
    });
    return true;
  } catch (error) {
    console.error('[Kafka] Failed to publish booking event:', error.message);
    return false;
  }
}

module.exports = {
  publishBookingEvent,
  bookingTopic
};
