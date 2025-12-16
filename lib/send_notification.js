const axios = require("axios");
const { DEVICE_TYPES, FCM_ENDPOINT } = require('../utils/constants');

// send push notification to device when use s2s flow
// user send IM message -> IP callback to im_notification_url(s2s) -> client server send push to device

function buildFcmPayload(deviceType, deviceToken, title, body) {
  if (deviceType === DEVICE_TYPES.ANDROID) {
    return {
      to: deviceToken,
      data: {
        sound: 'default',
        content_available: true,
        priority: 'high',
        title: title,
        body: body
      }
    };
  }

  return {
    to: deviceToken,
    notification: {
      title: title,
      body: body
    }
  };
}

const send_notification = async (device_info, title, body) => {
  const { device_type, device_token } = device_info;

  console.log('[ipification_notification] start send_notification');

  const data = buildFcmPayload(device_type, device_token, title, body);

  console.log(`[ipification_notification] device_type: ${device_type}, device_token: ${device_token}, data: ${JSON.stringify(data)}`);

  try {
    const response = await axios.request({
      url: FCM_ENDPOINT,
      method: 'POST',
      data: data,
      headers: {
        Authorization: `key=${process.env.FIREBASE_SERVER_KEY}`
      }
    });

    console.log(`[ipification_notification] response status: ${response.status}, data: ${JSON.stringify(response.data)}`);
    return response;
  } catch (error) {
    console.error('[ipification_notification] error sending notification:', error.message);
    throw error;
  }
}

module.exports = send_notification;

