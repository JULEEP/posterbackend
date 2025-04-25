import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const client = new twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

export const SendSms = (to, message) => {
  return client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE, // Verified Twilio number
    to: to
  });
};
