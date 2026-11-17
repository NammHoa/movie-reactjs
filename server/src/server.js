require('dotenv').config()
require('./config/env').assertEnv()

require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const app = require('./app')
const connectDB = require('./config/db')
const { startExpirySweeper } = require('./services/bookingExpiry')

const PORT = process.env.PORT || 5000

connectDB().then(() => {
  startExpirySweeper()
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
})
