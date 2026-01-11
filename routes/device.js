
const express = require('express');
const config = require('config');
const dataStore = require('../lib/data_store');
const sendNotification = require('../lib/send_notification');
const { NOTIFICATION_TYPES, ERROR_MESSAGES, HTTP_STATUS, PUSH_NOTIFICATION_MESSAGES } = require('../utils/constants');
const router = express.Router();

const notification_secret_key = config.notification_secret_key || process.env.NOTIFICATION_SECRET_KEY;

function validateSecretKey(secretKey) {
  return secretKey === notification_secret_key;
}

function getPushMessage(notificationType) {
  return notificationType === NOTIFICATION_TYPES.SESSION_COMPLETED
    ? PUSH_NOTIFICATION_MESSAGES.SESSION_COMPLETED
    : PUSH_NOTIFICATION_MESSAGES.SESSION_EXPIRED;
}

// use for s2s flow with ip-backchannel-im-auth = true
router.post("/register", async (req, res) => {
  const { device_id, device_token, device_type } = req.body || {};
  console.log(`[register_device] get token -- device_id: ${device_id}, device_type: ${device_type}, device_token: ${device_token}`);
  if(device_id && device_token) await dataStore.set(`device:${device_id}`, { device_token, device_type });
  res.send({ device_id, device_token, device_type });
})

router.post("/notification/:secret_key", async (req, res) => {
  if(!validateSecretKey(req.params.secret_key)) {
    console.log(`[ipification_notification] wrong secret key: ${req.params.secret_key}`);
    res.status(HTTP_STATUS.BAD_REQUEST).send();
    return;
  }

  const device_id = req.body ? req.body.state : null;
  const notification_type = req.body ? req.body.notification_type : null;

  if(!device_id) {
    console.log(`[ipification_notification] device_id is required`);
    res.status(HTTP_STATUS.BAD_REQUEST).send(ERROR_MESSAGES.DEVICE_ID_REQUIRED);
    return;
  }

  if(!notification_type) {
    console.log(`[ipification_notification] notification_type is required`);
    res.status(HTTP_STATUS.BAD_REQUEST).send(ERROR_MESSAGES.NOTIFICATION_TYPE_REQUIRED);
    return;
  }

  const device_info = await dataStore.get(`device:${device_id}`);
  console.log(`[ipification_notification] device_id: ${device_id}, device_info: ${JSON.stringify(device_info)}`);

  if(!device_info) {
    console.log(`[ipification_notification] device not found`);
    res.send();
    return;
  }

  try {
    console.log(`[ipification_notification] invoke send_notification`);
    const push_message = getPushMessage(notification_type);
    // send push notification to mobile app
    await sendNotification(device_info, 'Merchant Service', push_message);

    res.send();
  } catch (error) {
    console.error('[ipification_notification] error:', error);
    res.status(HTTP_STATUS.BAD_REQUEST).send(error.message);
  }
});

module.exports = router;
