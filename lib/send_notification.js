const axios = require("axios");

// send push notification to device when use s2s flow
// user send IM message -> IP callback to im_notification_url(s2s) -> client server send push to device

const send_notification = async (device_info, title, body) => {
  const { device_type, device_token } = device_info;
  let data;

  console.log('[ipification_notification] start send_notification');

  if(device_type == 'android') {
    data = {
      to: device_token,
      data: {
        sound: 'default',
        content_available: true,
        priority: 'high',
        title: title,
        body: body
      }
    }
  } else {
    data = {
      to: device_token,
      notification: {
        title: title,
        body: body
      }
    }
  }

  console.log(`[ipification_notification] device_type: ${device_type}, device_token: ${device_token}, data: ${JSON.stringify(data)}`);
  const response = await axios.request({
    url: 'https://fcm.googleapis.com/fcm/send',
    method: 'POST',
    data: data,
    headers: {
      Authorization: `key=${process.env.FIREBASE_SERVER_KEY}`
    }
  });

  console.log(`[ipification_notification] response status: ${response.status}, data: ${JSON.stringify(response.data)}`);
  return response;
}

module.exports = send_notification;

