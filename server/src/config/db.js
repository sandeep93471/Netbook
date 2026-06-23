import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

// Atlas first; if the URI is missing/broken, spin up a real in-memory MongoDB
// so the app is still usable for dev/demo. Data resets on server restart.
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI
  if (uri && !uri.includes('<')) {
    try {
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
      console.log(`MongoDB connected: ${conn.connection.host}`)
      return
    } catch (err) {
      console.error(`Atlas connection failed: ${err.message}`)
      console.error('Falling back to in-memory MongoDB…')
    }
  } else {
    console.log('No MONGODB_URI set — using in-memory MongoDB')
  }

  const mem = await MongoMemoryServer.create()
  const conn = await mongoose.connect(mem.getUri('netbook'))
  console.log(`In-memory MongoDB running (data resets on restart): ${conn.connection.host}`)
}
