import 'dotenv/config'
import http from 'http'
import app from './src/app.js'
import { connectDB } from './src/config/db.js'
import { initSocket } from './src/socket/index.js'

const PORT = process.env.PORT || 5000

const server = http.createServer(app)
initSocket(server)

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Netbook API running on http://localhost:${PORT}`)
  })
})
