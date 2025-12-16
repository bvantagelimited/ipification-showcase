const QR_CODE_SUFFIX = '-qrcode';
const NOTIFICATION_TYPES = {
  SESSION_COMPLETED: 'session_completed',
  SESSION_EXPIRED: 'session_expired'
};

const DEVICE_TYPES = {
  ANDROID: 'android',
  IOS: 'ios'
};

const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  INTERNAL_SERVER_ERROR: 500
};

const ERROR_MESSAGES = {
  CLIENT_NOT_FOUND: 'Client not found',
  DEVICE_ID_REQUIRED: 'device_id is required',
  NOTIFICATION_TYPE_REQUIRED: 'notification_type is required',
  DEVICE_NOT_FOUND: 'device not found'
};

const PUSH_NOTIFICATION_MESSAGES = {
  SESSION_COMPLETED: 'Verification is successful. please back to your app/website',
  SESSION_EXPIRED: 'Your session is expired. Please back into your application'
};

const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';

const MAX_RETRY_ATTEMPTS = 4;
const RETRY_DELAY_MS = 1000;

module.exports = {
  QR_CODE_SUFFIX,
  NOTIFICATION_TYPES,
  DEVICE_TYPES,
  HTTP_STATUS,
  ERROR_MESSAGES,
  PUSH_NOTIFICATION_MESSAGES,
  FCM_ENDPOINT,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS
};

