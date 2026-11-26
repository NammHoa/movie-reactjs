const mongoose = require('mongoose')

// Chỉ có một tài liệu (key 'home') giữ id phim theo thứ tự trên banner. Nhờ nằm chung một tài liệu,
// giới hạn số lượng, chống trùng và đổi thứ tự đều làm được bằng một lệnh nguyên tử.
const bannerListSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  movies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
})

module.exports = mongoose.model('BannerList', bannerListSchema)
