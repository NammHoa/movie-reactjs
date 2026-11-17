const mongoose = require('mongoose')

const showtimeSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true }, // = startTime + thời lượng phim
    price: { type: Number, required: true }, // VND
    bookedSeats: { type: [String], default: [] }, // ví dụ: "A1", "B5"
  },
  { timestamps: true },
)

showtimeSchema.index({ room: 1, startTime: 1 })
showtimeSchema.index({ movie: 1, startTime: 1 })

module.exports = mongoose.model('Showtime', showtimeSchema)
