import { Router } from 'express'
import { body } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/error.js'
import * as c from '../controllers/authController.js'

const router = Router()

// Brute-force protection on auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { message: 'Too many attempts — try later' } })
const codeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { message: 'Too many code requests — try later' } })

router.post('/register', authLimiter, [
  body('displayName').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], validate, c.register)

router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password required'),
], validate, c.login)

router.post('/google', authLimiter, body('credential').isString().notEmpty(), validate, c.googleAuth)

router.post('/logout', c.logout)
router.get('/me', protect, c.me)
router.post('/refresh', c.refresh)

router.post('/send-verify-code', protect, codeLimiter, c.sendVerifyCode)
router.post('/verify-email', protect, c.verifyEmail)
router.post('/forgot', codeLimiter, body('email').isEmail(), validate, c.forgotPassword)
router.post('/reset', codeLimiter, [
  body('email').isEmail(),
  body('code').isLength({ min: 6, max: 6 }),
  body('password').isLength({ min: 8 }),
], validate, c.resetPassword)

export default router
