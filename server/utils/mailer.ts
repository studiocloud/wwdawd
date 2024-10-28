import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

interface EmailOptions {
  subject: string;
  text: string;
  attachments?: Array<{
    filename: string;
    path: string;
  }>;
}

export async function sendNotificationEmail(
  to: string,
  options: EmailOptions
): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: options.subject,
    text: options.text,
    attachments: options.attachments
  });
}