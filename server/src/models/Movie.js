const mongoose = require('mongoose')

const AGE_RATINGS = ['P', 'K', 'T13', 'T16', 'T18']

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    poster: String,
    trailer: String,
    backdrop: { type: String, default: '' }, // ảnh ngang 16:9, dùng cho banner và đầu trang chi tiết
    ageRating: { type: String, enum: ['', ...AGE_RATINGS], default: '' },
    country: { type: String, default: '' },
    formats: { type: [String], default: [] }, // ví dụ: "2D", "Phụ đề tiếng Anh"
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
module.exports.AGE_RATINGS = AGE_RATINGS
