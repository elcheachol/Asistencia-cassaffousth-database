import nodemailer from 'nodemailer';

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isMailerConfigured(): boolean {
  return Boolean(
    process.env.BREVO_API_KEY?.trim() ||
      process.env.RESEND_API_KEY?.trim() ||
      (process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim())
  );
}

export async function sendInstitutionalEmail(input: SendMailInput): Promise<void> {
  const brevoKey = process.env.BREVO_API_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const mailFrom = process.env.MAIL_FROM?.trim();

  if (brevoKey) {
    const senderEmail = mailFrom || smtpUser || process.env.ADMIN_EMAIL?.trim();
    if (!senderEmail) {
      throw new Error(
        'Falta configurar MAIL_FROM (correo remitente verificado en Brevo) en las variables de entorno.'
      );
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'I.P.E.T. N° 247', email: senderEmail },
        to: [{ email: input.to }],
        subject: input.subject,
        textContent: input.text,
        ...(input.html ? { htmlContent: input.html } : {}),
      }),
    });

    if (!res.ok) {
      const details = await res.text().catch(() => '');
      console.error('Brevo email error:', res.status, details);
      throw new Error('No se pudo enviar el correo mediante Brevo.');
    }
    return;
  }

  if (resendKey) {
    const fromHeader =
      mailFrom ||
      (smtpUser ? `I.P.E.T. N° 247 <${smtpUser}>` : 'I.P.E.T. N° 247 <onboarding@resend.dev>');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromHeader,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
      }),
    });

    if (!res.ok) {
      const details = await res.text().catch(() => '');
      console.error('Resend email error:', res.status, details);
      throw new Error('No se pudo enviar el correo mediante Resend.');
    }
    return;
  }

  if (smtpUser && smtpPass) {
    const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 12000,
      greetingTimeout: 12000,
    });

    await transporter.sendMail({
      from: mailFrom || `"I.P.E.T. N° 247" <${smtpUser}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    });
    return;
  }

  throw new Error(
    'El envío de correos desde el servidor no está configurado. Agregue BREVO_API_KEY, RESEND_API_KEY o SMTP_USER/SMTP_PASS en las variables de entorno.'
  );
}
