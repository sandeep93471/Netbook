import nodemailer from 'nodemailer'

const canSend = () => process.env.EMAIL_USER && process.env.EMAIL_PASS

// Explicit host/port + timeouts — a dead SMTP connection must fail fast
// instead of hanging the register request forever (cloud hosts can stall
// on Gmail's implicit config; STARTTLS on 587 is the most reliable route).
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

// 6-digit code email — verify + password reset share this
export const sendCodeEmail = async (to, code, purpose = 'verify') => {
  if (!transporter) {
    console.log(`[mailer disabled] ${purpose} code for ${to}: ${code}`)
    return false
  }
  const subject = purpose === 'verify'
    ? 'Your Netbook verification code'
    : 'Your Netbook password reset code'
  await transporter.sendMail({
    from: `"Netbook" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text: `Your code is: ${code}\nIt expires in 10 minutes.`,
    html: `<h2>${subject}</h2><p>Your code is:</p><h1 style="letter-spacing:6px">${code}</h1><p>It expires in 10 minutes.</p>`,
  })
  return true
}
