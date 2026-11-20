const mongoose = require('mongoose')

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    poster: String,
    trailer: String,
    genres: [String],
    duration: { type: Number, required: true }, // phút
    releaseDate: Date,
    status: { type: String, enum: ['now_showing', 'coming_soon', 'ended'], default: 'coming_soon' },
    // Lưu sẵn điểm trung bình để danh sách phim không phải tính lại; được cập nhật mỗi khi đánh giá thay đổi
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Movie', movieSchema)
