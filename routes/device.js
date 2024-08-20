

const express = require('express');
const dataStore = require('../lib/data_store');
const sendNotification = require('../lib/send_notification');
const router = express.Router();

// use for s2s flow with ip-backchannel-im-auth = true
router.post("/register", async (req, res) => {
  const { device_id, device_token, device_type } = req.body || {};
  console.log(`[register_device] get token -- device_id: ${device_id}, device_type: ${device_type}, device_token: ${device_token}`);
  if(device_id && device_token) await dataStore.set(`device:${device_id}`, { device_token, device_type });
  res.send({ device_id, device_token, device_type });
})

router.post("/notification/:secret_key", async (req, res) => {
  if(req.params.secret_key !== process.env.NOTIFICATION_SECRET_KEY) {
    console.log(`[ipification_notification] wrong secret key: ${req.params.secret_key}`);
    res.status(400).send();
    return;
  }

  const device_id = req.body ? req.body.state : null;
  const notification_type = req.body ? req.body.notification_type : null;

  if(!device_id) {
    console.log(`[ipification_notification] device_id is required`);
    res.status(400).send("device_id is required");
    return;
  }

  if(!notification_type) {
    console.log(`[ipification_notification] notification_type is required`);
    res.status(400).send("notification_type is required");
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
    const push_message = notification_type === 'session_completed' ? 'Verification is successful. please back to your app/website' : 'Your session is expired. Please back into your application';
    // send push notification to mobile app
    await sendNotification(device_info,
      'Merchant Service',
      push_message
    );

    res.send();
  } catch (error) {
    console.log(error);
    res.status(400).send(error.message);
  }
});

module.exports = router;

