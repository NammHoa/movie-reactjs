const mongoose = require('mongoose')
const Movie = require('../models/Movie')
const Review = require('../models/Review')
const Showtime = require('../models/Showtime')
const { removeMovie } = require('../services/banners')
const { getBoxOffice } = require('../services/boxOffice')
const { serverError } = require('../utils/http')

const STATUSES = ['now_showing', 'coming_soon', 'ended']
const URL_RE = /^https?:\/\//i
const MAX_COUNTRY = 60

const str = (v) => (typeof v === 'string' ? v.trim() : '')

// Chỉ lấy các trường được phép (tránh người dùng ghi đè trường lạ).
// partial = true: chỉ xử lý các trường có gửi lên (dùng cho cập nhật).
function clean(body, partial = false) {
  const data = {}
  const has = (k) => body[k] !== undefined

  if (!partial || has('title')) {
    data.title = str(body.title)
    if (!data.title) return { error: 'Vui lòng nhập tên phim' }
  }
  if (!partial || has('duration')) {
    data.duration = Number(body.duration)
    if (!Number.isFinite(data.duration) || data.duration <= 0 || data.duration > 600) {
      return { error: 'Thời lượng phải từ 1 đến 600 phút' }
    }
  }
  if (has('description')) data.description = str(body.description)
  for (const k of ['poster', 'trailer', 'backdrop']) {
    if (has(k)) {
      data[k] = str(body[k])
      if (data[k] && !URL_RE.test(data[k])) return { error: `Đường dẫn ${k} phải bắt đầu bằng http:// hoặc https://` }
    }
  }
  for (const k of ['genres', 'formats']) {
    if (!has(k)) continue
    const list = Array.isArray(body[k]) ? body[k] : str(body[k]).split(',')
    data[k] = list.map(str).filter(Boolean)
  }
  if (has('ageRating')) {
    if (body.ageRating !== '' && !Movie.AGE_RATINGS.includes(body.ageRating)) return { error: 'Độ tuổi không hợp lệ' }
    data.ageRating = body.ageRating
  }
  if (has('country')) {
    data.country = str(body.country)
    if (data.country.length > MAX_COUNTRY) return { error: `Quốc gia tối đa ${MAX_COUNTRY} ký tự` }
  }
  if (has('releaseDate')) {
    if (body.releaseDate) {
      const d = new Date(body.releaseDate)
      if (isNaN(d)) return { error: 'Ngày khởi chiếu không hợp lệ' }
      data.releaseDate = d
    } else {
      data.releaseDate = null
    }
  }
  if (has('status')) {
    if (!STATUSES.includes(body.status)) return { error: 'Trạng thái không hợp lệ' }
    data.status = body.status
  }
  return { data }
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// GET /api/movies?status=now_showing&q=...
exports.list = async (req, res) => {
  try {
    const filter = {}
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status
    const q = str(req.query.q)
    if (q) filter.title = { $regex: escapeRegex(q), $options: 'i' }
    const movies = await Movie.find(filter).sort({ releaseDate: -1, createdAt: -1 }).limit(200)
    res.json(movies)
  } catch (err) {
    serverError(res, err)
  }
}

// GET /api/movies/box-office (công khai)
exports.boxOffice = async (req, res) => {
  try {
    res.json(await getBoxOffice())
  } catch (err) {
    serverError(res, err)
  }
}

exports.getOne = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Không tìm thấy phim' })
    const movie = await Movie.findById(req.params.id)
    if (!movie) return res.status(404).json({ message: 'Không tìm thấy phim' })
    res.json(movie)
  } catch (err) {
    serverError(res, err)
  }
}

exports.create = async (req, res) => {
  try {
    const { data, error } = clean(req.body)
    if (error) return res.status(400).json({ message: error })
    res.status(201).json(await Movie.create(data))
  } catch (err) {
    serverError(res, err)
  }
}

exports.update = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Không tìm thấy phim' })
    const { data, error } = clean(req.body, true)
    if (error) return res.status(400).json({ message: error })
    const movie = await Movie.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after' })
    if (!movie) return res.status(404).json({ message: 'Không tìm thấy phim' })
    res.json(movie)
  } catch (err) {
    serverError(res, err)
  }
}

exports.remove = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Không tìm thấy phim' })
    if (await Showtime.exists({ movie: req.params.id })) {
      return res.status(409).json({ message: 'Phim đang có suất chiếu, hãy xóa các suất chiếu trước' })
    }
    const movie = await Movie.findByIdAndDelete(req.params.id)
    if (!movie) return res.status(404).json({ message: 'Không tìm thấy phim' })
    await Review.deleteMany({ movie: movie._id })
    await removeMovie(movie._id)
    res.json({ message: 'Đã xóa phim' })
  } catch (err) {
    serverError(res, err)
  }
}
