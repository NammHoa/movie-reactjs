const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role })

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' })
    }
    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'Email đã được sử dụng' })
    }
    const hashed = await bcrypt.hash(password, 10)
    const user = await User.create({ name, email, password: hashed })
    res.status(201).json({ user: publicUser(user), token: signToken(user) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' })
    }
    res.json({ user: publicUser(user), token: signToken(user) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
