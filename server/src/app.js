const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const { apiLimiter } = require('./middleware/rateLimit')
const { clientUrl } = require('./config/env')

const app = express()

// Sau reverse proxy (Render, Nginx...) req.ip là địa chỉ của proxy nên mọi người dùng bị tính chung một hạn mức.
// Đặt TRUST_PROXY=1 (số proxy đứng trước server) để lấy đúng IP thật; để trống khi chạy local.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY))

app.use(helmet())
app.use(cors({ origin: clientUrl(), credentials: true }))
app.use(express.json({ limit: '20kb' }))
app.use(cookieParser())
app.use(morgan('dev'))

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api', apiLimiter)
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/movies', require('./routes/movieRoutes'))
app.use('/api/cinemas', require('./routes/cinemaRoutes'))
app.use('/api/rooms', require('./routes/roomRoutes'))
app.use('/api/showtimes', require('./routes/showtimeRoutes'))
app.use('/api/bookings', require('./routes/bookingRoutes'))
app.use('/api/payments', require('./routes/paymentRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))

app.use((req, res) => res.status(404).json({ message: 'Không tìm thấy API' }))
app.use(require('./middleware/errorHandler'))

module.exports = app
