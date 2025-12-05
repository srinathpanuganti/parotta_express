const nodemailer = require('nodemailer');

function isEmailConfigured() {
  const { GMAIL_USER, GMAIL_PASS, STORE_OWNER_EMAIL } = process.env;
  return Boolean(GMAIL_USER && GMAIL_PASS && STORE_OWNER_EMAIL);
}

function createTransporter() {
  const { GMAIL_USER, GMAIL_PASS } = process.env;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS, // For Gmail, use an App Password
    },
  });
}

function formatOrderText({ orderId, createdAt, totalAmount, items, user }) {
  const lines = [];
  lines.push(`Order ID: ${orderId}`);
  lines.push(`Date: ${new Date(createdAt).toLocaleString()}`);
  if (user) {
    const who = [user.name, user.email].filter(Boolean).join(' / ');
    lines.push(`User: ${who || user.username || user.id}`);
  }
  lines.push('');
  lines.push('Items:');
  items.forEach((it) => {
    lines.push(`- ${it.nameSnapshot} x${it.quantity} @ $${Number(it.priceSnapshot).toFixed(2)}`);
  });
  lines.push('');
  lines.push(`Total: $${Number(totalAmount).toFixed(2)}`);
  return lines.join('\n');
}

function formatOrderHtml({ orderId, createdAt, totalAmount, items, user }) {
  const itemRows = items
    .map(
      (it) =>
        `<tr><td style="padding:6px 12px;border:1px solid #eee;">${it.nameSnapshot}</td><td style="padding:6px 12px;border:1px solid #eee;">${it.quantity}</td><td style=\"padding:6px 12px;border:1px solid #eee;\">$${Number(
          it.priceSnapshot,
        ).toFixed(2)}</td></tr>`,
    )
    .join('');
  const userLine = user
    ? `<p><strong>User:</strong> ${[user.name, user.email].filter(Boolean).join(' / ') || user.username || user.id}</p>`
    : '';
  return `
    <div style="font-family: Arial, sans-serif;">
      <h2>Order Confirmation</h2>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Date:</strong> ${new Date(createdAt).toLocaleString()}</p>
      ${userLine}
      <table style="border-collapse:collapse;border:1px solid #eee;min-width:300px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 12px;border:1px solid #eee;">Item</th>
            <th style="text-align:left;padding:6px 12px;border:1px solid #eee;">Qty</th>
            <th style="text-align:left;padding:6px 12px;border:1px solid #eee;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <p style="margin-top:10px"><strong>Total:</strong> $${Number(totalAmount).toFixed(2)}</p>
    </div>
  `;
}

async function sendOrderEmails({ order, user, items }) {
  // Fail-soft if not configured
  if (!isEmailConfigured()) {
    // eslint-disable-next-line no-console
    console.log('[email] SMTP not configured; printing order summary');
    // eslint-disable-next-line no-console
    console.log(formatOrderText({
      orderId: order.id,
      createdAt: order.createdAt || new Date().toISOString(),
      totalAmount: order.totalAmount,
      items,
      user,
    }));
    return;
  }

  const { STORE_OWNER_EMAIL, MAIL_FROM, GMAIL_USER } = process.env;
  const from = MAIL_FROM || GMAIL_USER;
  const transporter = createTransporter();
  const context = {
    orderId: order.id,
    createdAt: order.createdAt || new Date().toISOString(),
    totalAmount: order.totalAmount,
    items,
    user,
  };

  const ownerMail = {
    from,
    to: STORE_OWNER_EMAIL,
    subject: `New Corporate Order ${order.id}`,
    text: formatOrderText(context),
    html: formatOrderHtml(context),
  };
  const userTo = user?.email;
  const userMail = userTo
    ? {
        from,
        to: userTo,
        subject: `Your Order ${order.id} Confirmation`,
        text: formatOrderText(context),
        html: formatOrderHtml(context),
      }
    : null;

  await transporter.sendMail(ownerMail);
  if (userMail) await transporter.sendMail(userMail);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatContactText({ name, email, message }) {
  return [
    'New contact form submission',
    `Name: ${name}`,
    `Email: ${email}`,
    '',
    'Message:',
    message,
  ].join('\n');
}

function formatContactHtml({ name, email, message }) {
  return `
    <div style="font-family: Arial, sans-serif;">
      <h2>New contact form submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Message:</strong></p>
      <div style="white-space:pre-wrap;padding:10px;border:1px solid #eee;border-radius:6px;background:#fafafa;">${escapeHtml(message)}</div>
    </div>
  `;
}

async function sendContactEmail({ name, email, message }) {
  if (!email || !message) {
    throw new Error('missing contact fields');
  }

  if (!isEmailConfigured()) {
    // eslint-disable-next-line no-console
    console.log('[email] SMTP not configured; printing contact message');
    // eslint-disable-next-line no-console
    console.log(formatContactText({ name, email, message }));
    return;
  }

  const { STORE_OWNER_EMAIL, MAIL_FROM, GMAIL_USER } = process.env;
  const from = MAIL_FROM || GMAIL_USER;
  const transporter = createTransporter();
  const context = { name, email, message };
  const ownerMail = {
    from,
    to: STORE_OWNER_EMAIL,
    replyTo: email,
    subject: `New contact form from ${name || email}`,
    text: formatContactText(context),
    html: formatContactHtml(context),
  };
  const ackMail = {
    from,
    to: email,
    subject: 'Thanks for contacting Parotta Express',
    text: `Hi ${name || 'there'},\n\nWe received your message and will get back to you soon.\n\nYour message:\n${message}\n\n-Parotta Express`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <p>Hi ${escapeHtml(name || 'there')},</p>
        <p>We received your message and will get back to you soon.</p>
        <p style="margin-bottom:4px;">Your message:</p>
        <div style="white-space:pre-wrap;padding:10px;border:1px solid #eee;border-radius:6px;background:#fafafa;">${escapeHtml(message)}</div>
        <p style="margin-top:12px;">- Parotta Express</p>
      </div>
    `,
  };

  await transporter.sendMail(ownerMail);
  await transporter.sendMail(ackMail);
}

async function sendPasswordResetEmail({ email, name, temporaryPassword }) {
  if (!email || !temporaryPassword) throw new Error('missing password reset fields');

  if (!isEmailConfigured()) {
    // eslint-disable-next-line no-console
    console.log('[email] SMTP not configured; printing reset info');
    // eslint-disable-next-line no-console
    console.log(`Reset for ${email} (${name || 'user'}): temp password "${temporaryPassword}"`);
    return;
  }

  const { STORE_OWNER_EMAIL, MAIL_FROM, GMAIL_USER } = process.env;
  const from = MAIL_FROM || GMAIL_USER;
  const transporter = createTransporter();
  const safeName = escapeHtml(name || 'there');

  const userMail = {
    from,
    to: email,
    subject: 'Your Parotta Express password reset',
    text: `Hi ${name || 'there'},\n\nWe received a password reset request for your corporate account. Use this temporary password to sign in, then change it from your profile:\n\n${temporaryPassword}\n\nIf you did not request this, please contact support.\n\n-Parotta Express`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <p>Hi ${safeName},</p>
        <p>We received a password reset request for your corporate account.</p>
        <p><strong>Temporary password:</strong></p>
        <div style="padding:10px;border:1px solid #eee;border-radius:6px;background:#fafafa;display:inline-block;font-weight:bold;">${escapeHtml(temporaryPassword)}</div>
        <p style="margin-top:10px;">Use it to sign in, then change your password from your profile.</p>
        <p>If you did not request this, please contact support.</p>
        <p style="margin-top:12px;">- Parotta Express</p>
      </div>
    `,
  };

  const ownerMail = STORE_OWNER_EMAIL
    ? {
        from,
        to: STORE_OWNER_EMAIL,
        subject: `Password reset requested for ${email}`,
        text: `A password reset was requested for ${email}. Temp password: ${temporaryPassword}`,
      }
    : null;

  if (ownerMail) await transporter.sendMail(ownerMail);
  await transporter.sendMail(userMail);
}

module.exports = { sendOrderEmails, isEmailConfigured, sendContactEmail, sendPasswordResetEmail };
