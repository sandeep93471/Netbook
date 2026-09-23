import nodemailer from 'nodemailer'

const canSend = () => process.env.EMAIL_USER && process.env.EMAIL_PASS

// Explicit host/port + timeouts — a dead SMTP connection must fail fast
// instead of hanging the request forever.
const transporter = canSend()
  ? nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    })
  : null

const codeContent = (code, purpose) => {
  const subject = purpose === 'verify'
    ? 'Your Netbook verification code'
    : 'Your Netbook password reset code'
  return {
    subject,
    textContent: `Your code is: ${code}\nIt expires in 10 minutes.`,
    htmlContent: `<h2>${subject}</h2><p>Your code is:</p><h1 style="letter-spacing:6px">${code}</h1><p>It expires in 10 minutes.</p>`,
  }
}

// Brevo HTTPS API — runs on port 443 so cloud hosts can't block it like SMTP.
// Preferred whenever BREVO_API_KEY is set; EMAIL_USER doubles as the verified sender.
const sendViaBrevo = async (to, code, purpose) => {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Netbook', email: process.env.EMAIL_USER },
      to: [{ email: to }],
      ...codeContent(code, purpose),
    }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Brevo ${res.status}: ${body.message || 'send failed'}`)
  }
  return true
}

// 6-digit code email — verify + password reset share this
export const sendCodeEmail = async (to, code, purpose = 'verify') => {
  if (process.env.BREVO_API_KEY) return sendViaBrevo(to, code, purpose)

  if (!transporter) {
    console.log(`[mailer disabled] ${purpose} code for ${to}: ${code}`)
    return false
  }
  await transporter.sendMail({
    from: `"Netbook" <${process.env.EMAIL_USER}>`,
    to,
    ...codeContent(code, purpose),
  })
  return true
}
