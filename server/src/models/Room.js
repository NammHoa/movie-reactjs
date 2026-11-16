const mongoose = require('mongoose')

const roomSchema = new mongoose.Schema(
  {
    cinema: { type: mongoose.Schema.Types.ObjectId, ref: 'Cinema', required: true },
    name: { type: String, required: true },
    rows: { type: Number, default: 8 },
    seatsPerRow: { type: Number, default: 10 },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Room', roomSchema)
