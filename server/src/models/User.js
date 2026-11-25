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
    emailReminders: { type: Boolean, default: true }, // nhận email nhắc giờ chiếu; tài khoản cũ chưa có trường này coi như bật
    passwordChangedAt: Date, // token cấp trước thời điểm này không còn dùng được
  },
  { timestamps: true },
)

module.exports = mongoose.model('User', userSchema)
