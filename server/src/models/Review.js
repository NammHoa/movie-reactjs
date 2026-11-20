const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true },
)

// Mỗi người một đánh giá cho mỗi phim; chỉ mục unique chặn trùng ngay cả khi gửi hai request cùng lúc
reviewSchema.index({ movie: 1, user: 1 }, { unique: true })
reviewSchema.index({ movie: 1, createdAt: -1 })

module.exports = mongoose.model('Review', reviewSchema)
