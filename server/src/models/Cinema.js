const mongoose = require('mongoose')

const cinemaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: String,
    city: String,
  },
  { timestamps: true },
)

module.exports = mongoose.model('Cinema', cinemaSchema)
