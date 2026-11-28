const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // họ và tên
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    username: { type: String, unique: true, sparse: true, trim: true, lowercase: true }, // chỉ tài khoản chi nhánh có
    password: { type: String, required: true }, // đã hash
    dob: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    city: String,
    district: String,
    address: String,
    role: { type: String, enum: ['user', 'manager', 'admin'], default: 'user' }, // admin: trụ sở; manager: quản lý một rạp
    cinema: { type: mongoose.Schema.Types.ObjectId, ref: 'Cinema' }, // rạp của quản lý; vai trò khác không có trường này
    emailReminders: { type: Boolean, default: true }, // nhận email nhắc giờ chiếu; tài khoản cũ chưa có trường này coi như bật
    passwordChangedAt: Date, // token cấp trước thời điểm này không còn dùng được
  },
  { timestamps: true },
)

module.exports = mongoose.model('User', userSchema)
