import nodemailer from 'nodemailer'

const canSend = () => process.env.EMAIL_USER && process.env.EMAIL_PASS

const transporter = canSend()
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
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
