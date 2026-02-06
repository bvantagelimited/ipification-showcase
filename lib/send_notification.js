const config = require('config');
const admin = require('firebase-admin');
const fs = require('fs');
const { DEVICE_TYPES } = require('../utils/constants');

// send push notification to device when use s2s flow
// user send IM message -> IP callback to im_notification_url(s2s) -> client server send push to device

function buildFcmPayload(deviceType, deviceToken, title, body) {
  if (deviceType === DEVICE_TYPES.ANDROID) {
    return {
      notification: {
        title: title,
        body: body
      },
      token: deviceToken
    };
  }

  return {
    notification: {
      title: title,
      body: body
    },
    token: deviceToken
  };
}

function loadServiceAccount() {
  const serviceAccountObject = config.firebase_service_account;

  if (serviceAccountObject && typeof serviceAccountObject === 'object') {
    if (serviceAccountObject.private_key) {
      serviceAccountObject.private_key = serviceAccountObject.private_key.replace(/\\n/g, '\n');
    }
    return serviceAccountObject;
  }

  throw new Error('Missing Firebase service account credentials');
}

function getFirebaseApp() {
  if (admin.apps && admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount = loadServiceAccount();
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const send_notification = async (device_info, title, body) => {
  const { device_type, device_token } = device_info;

  console.log('[send_notification] start send_notification');

  const message = buildFcmPayload(device_type, device_token, title, body);

  console.log(`[send_notification] device_type: ${device_type}, device_token: ${device_token}`);
  console.log(`[send_notification] message: ${JSON.stringify(message)}`);

  try {
    getFirebaseApp();
    const response = await admin.messaging().send(message);

    console.log(`[send_notification] response: ${response}`);
    return response;
  } catch (error) {
    console.error('[send_notification] error:', error.message);
    throw error;
  }
}

module.exports = send_notification;
