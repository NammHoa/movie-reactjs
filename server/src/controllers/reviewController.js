const mongoose = require('mongoose')
const Movie = require('../models/Movie')
const Review = require('../models/Review')
const { isId, str, wrap } = require('../utils/http')
const { hasWatched, refreshRating } = require('../services/reviews')

const NO_MOVIE = { message: 'Không tìm thấy phim' }
const NO_REVIEW = { message: 'Không tìm thấy đánh giá' }
const MAX_COMMENT = 500

// Chỉ để lộ tên người đánh giá, không có email hay thông tin khác
const present = (review, viewerId) => ({
  _id: review._id,
  rating: review.rating,
  comment: review.comment,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
  user: { name: review.user?.name || 'Người dùng' },
  mine: !!viewerId && String(review.user?._id ?? review.user) === String(viewerId),
})

// GET /api/movies/:id/reviews?page=1&limit=10 (ai cũng xem được)
exports.list = wrap(async (req, res) => {
  const { id } = req.params
  if (!isId(id)) return res.status(404).json(NO_MOVIE)
  const movie = await Movie.findById(id).select('ratingAvg ratingCount')
  if (!movie) return res.status(404).json(NO_MOVIE)

  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10))

  const [items, groups] = await Promise.all([
    Review.find({ movie: id })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name'),
    Review.aggregate([{ $match: { movie: new mongoose.Types.ObjectId(id) } }, { $group: { _id: '$rating', n: { $sum: 1 } } }]),
  ])
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const g of groups) breakdown[g._id] = g.n

  res.json({
    average: movie.ratingAvg,
    count: movie.ratingCount,
    breakdown,
    page,
    pages: Math.max(1, Math.ceil(movie.ratingCount / limit)),
    items: items.map((r) => present(r)),
  })
})

// GET /api/movies/:id/reviews/me: đánh giá của chính mình và có được phép đánh giá không
exports.mine = wrap(async (req, res) => {
  const { id } = req.params
  if (!isId(id)) return res.status(404).json(NO_MOVIE)
  if (!(await Movie.exists({ _id: id }))) return res.status(404).json(NO_MOVIE)

  const review = await Review.findOne({ movie: id, user: req.user.id }).populate('user', 'name')
  res.json({
    canReview: !!review || (await hasWatched(req.user.id, id)),
    review: review ? present(review, req.user.id) : null,
  })
})

// PUT /api/movies/:id/reviews: lần đầu thì tạo, đã có thì cập nhật
exports.save = wrap(async (req, res) => {
  const { id } = req.params
  if (!isId(id)) return res.status(404).json(NO_MOVIE)

  const { rating } = req.body
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Điểm đánh giá phải là số nguyên từ 1 đến 5' })
  }
  if (req.body.comment !== undefined && typeof req.body.comment !== 'string') {
    return res.status(400).json({ message: 'Nhận xét không hợp lệ' })
  }
  const comment = str(req.body.comment)
  if (comment.length > MAX_COMMENT) {
    return res.status(400).json({ message: `Nhận xét tối đa ${MAX_COMMENT} ký tự` })
  }

  if (!(await Movie.exists({ _id: id }))) return res.status(404).json(NO_MOVIE)
  if (!(await hasWatched(req.user.id, id))) {
    return res.status(403).json({ message: 'Bạn chỉ có thể đánh giá sau khi đã xem phim (vé đã thanh toán và suất chiếu đã kết thúc)' })
  }

  const filter = { movie: id, user: req.user.id }
  const options = { upsert: true, returnDocument: 'after', runValidators: true, includeResultMetadata: true }
  let result
  try {
    result = await Review.findOneAndUpdate(filter, { rating, comment }, options)
  } catch (err) {
    // Hai request đầu tiên cùng lúc: một bên thắng việc tạo, bên kia thử lại sẽ thành cập nhật
    if (err.code !== 11000) throw err
    result = await Review.findOneAndUpdate(filter, { rating, comment }, options)
  }

  await refreshRating(id)
  const review = { ...result.value.toObject(), user: { _id: req.user.id, name: req.account.name } }
  res.status(result.lastErrorObject?.updatedExisting ? 200 : 201).json(present(review, req.user.id))
})

// DELETE /api/reviews/:id: chủ đánh giá hoặc admin
exports.remove = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NO_REVIEW)
  const review = await Review.findById(req.params.id)
  if (!review) return res.status(404).json(NO_REVIEW)
  if (req.user.role !== 'admin' && String(review.user) !== req.user.id) {
    return res.status(403).json({ message: 'Bạn không có quyền xóa đánh giá này' })
  }
  await review.deleteOne()
  await refreshRating(review.movie)
  res.json({ message: 'Đã xóa đánh giá' })
})
