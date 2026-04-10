import nodemailer from 'nodemailer';
import config from '../config/index.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  // In development without SMTP credentials, log to console
  if (config.isDev && (!config.email.user || !config.email.pass)) {
    console.log('[EMAIL] No SMTP credentials — emails will be logged to console');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  return transporter;
}

/**
 * Send an email. Falls back to console.log in dev mode.
 */
export async function sendEmail({ to, subject, html, text, attachments }) {
  const transport = getTransporter();

  const mailOptions = {
    from: config.email.from,
    to,
    subject,
    html,
    text,
    ...(attachments ? { attachments } : {}),
  };

  if (!transport) {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║           📧  EMAIL (DEV MODE)           ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  To:      ${to}`);
    console.log(`║  Subject: ${subject}`);
    console.log('╠══════════════════════════════════════════╣');
    console.log(text || html);
    console.log('╚══════════════════════════════════════════╝\n');
    return { messageId: 'dev-mode', accepted: [to] };
  }

  return transport.sendMail(mailOptions);
}

/**
 * Send doctor credentials email.
 */
export async function sendDoctorCredentials({ to, doctorName, email, username, tempPassword, orgName }) {
  const subject = `[DiagnoScope] Your Login Credentials — ${orgName}`;
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0a0e1a; color: #e0e4f0; border-radius: 12px;">
      <h1 style="color: #00e5ff; font-size: 24px; margin-bottom: 8px;">🧬 DiagnoScope</h1>
      <p style="color: #7a8199; font-size: 14px; margin-bottom: 24px;">Medical Imaging Platform</p>
      
      <p>Dear <strong>Dr. ${doctorName}</strong>,</p>
      <p>You are registered under <strong>${orgName}</strong>.</p>
      
      <div style="background: #141929; border: 1px solid #1e2740; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #00e5ff; margin-top: 0;">Your Login Credentials</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #7a8199;">Email</td>
            <td style="padding: 8px 0; font-family: monospace; color: #00e5ff; font-size: 16px;">${email || to}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #7a8199;">Password</td>
            <td style="padding: 8px 0; font-family: monospace; color: #ff9100; font-size: 16px;">${tempPassword}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #7a8199;">Doctor Username</td>
            <td style="padding: 8px 0; font-family: monospace; color: #7dd3fc; font-size: 16px;">${username}</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #ff9100; font-size: 13px;">⚠️ Please change your password after your first login.</p>
      <p style="color: #7a8199; font-size: 12px; margin-top: 32px;">This is an automated message from DiagnoScope. Please do not reply.</p>
    </div>
  `;
  const text = `Dr. ${doctorName},\n\nYou are registered under ${orgName}.\n\nLogin Credentials:\nEmail: ${email || to}\nPassword: ${tempPassword}\nDoctor Username: ${username}\n\nPlease change your password after your first login.`;

  return sendEmail({ to, subject, html, text });
}
