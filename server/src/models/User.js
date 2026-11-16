const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // họ và tên
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    password: { type: String, required: true }, // đã hash
    dob: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    city: String,
    district: String,
    address: String,
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('User', userSchema)
