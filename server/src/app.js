const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/movies', require('./routes/movieRoutes'))
app.use('/api/cinemas', require('./routes/cinemaRoutes'))
app.use('/api/rooms', require('./routes/roomRoutes'))
app.use('/api/showtimes', require('./routes/showtimeRoutes'))
app.use('/api/bookings', require('./routes/bookingRoutes'))
app.use('/api/payments', require('./routes/paymentRoutes'))

app.use((req, res) => res.status(404).json({ message: 'Không tìm thấy API' }))

module.exports = app
