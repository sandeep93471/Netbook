import { validationResult } from 'express-validator'

// Runs after express-validator chains — returns first error as JSON
export const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg })
  }
  next()
}

// Catch-all error handler — registered last in app.js
export const errorHandler = (err, req, res, next) => {
  console.error(err)
  const status = res.statusCode === 200 ? 500 : res.statusCode
  res.status(status).json({ message: err.message || 'Server error' })
}
