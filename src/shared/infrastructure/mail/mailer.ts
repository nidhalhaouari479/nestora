import nodemailer from "nodemailer";

function smtpConfig() {
  return {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    senderEmail: process.env.SMTP_SENDER_EMAIL ?? "",
    senderName: process.env.SMTP_SENDER_NAME ?? "Nestora",
  };
}

let transporter: nodemailer.Transporter | undefined;

// Server only. Without SMTP_HOST in development, the email is printed in the server console.
export async function sendMail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  const smtp = smtpConfig();
  if (!smtp.host) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP_HOST is not configured.");
    console.info(`[mail] SMTP non configuré — email pour ${to}\n${text}`);
    return;
  }

  transporter ??= nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });

  await transporter.sendMail({ from: { name: smtp.senderName, address: smtp.senderEmail || smtp.user }, to, subject, text, html });
}
