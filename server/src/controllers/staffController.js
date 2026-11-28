// Tài khoản chi nhánh (quản lý rạp). Chỉ trụ sở gọi được: các route nằm dưới router.use(isAdmin).
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Cinema = require('../models/Cinema')
const { str, isId, wrap } = require('../utils/http')
const { USERNAME_RE, parseIdentifier, passwordError } = require('../utils/validators')
const refreshTokens = require('../services/refreshTokens')

const NAME_MAX = 100
const NOT_FOUND = { message: 'Không tìm thấy người dùng' }
const NO_CINEMA = { message: 'Rạp không tồn tại' }
const USERNAME_TAKEN = { message: 'Tên đăng nhập đã được sử dụng' }
const EMAIL_TAKEN = { message: 'Email đã được sử dụng' }

const findCinema = (id) => (isId(id) ? Cinema.findById(id).select('name').lean() : null)

const present = (u, cinema) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  username: u.username,
  role: u.role,
  cinema,
  createdAt: u.createdAt,
})

// Tài khoản chi nhánh là tài khoản có tên đăng nhập. Khách và admin trụ sở không bao giờ đi qua đây.
const isBranchAccount = (u) => !!u.username && u.role !== 'admin'

// POST /api/admin/users/managers { username, name, email, cinema, password }
exports.createManager = wrap(async (req, res) => {
  const body = req.body ?? {}
  const username = str(body.username).toLowerCase()
  const name = str(body.name)
  const email = parseIdentifier(body.email)

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ message: 'Tên đăng nhập gồm 4–30 ký tự: chữ thường, số, dấu chấm, có ít nhất một chữ' })
  }
  if (!name || name.length > NAME_MAX) return res.status(400).json({ message: `Vui lòng nhập họ tên (tối đa ${NAME_MAX} ký tự)` })
  if (email?.type !== 'email') return res.status(400).json({ message: 'Email không hợp lệ' })
  const pwErr = passwordError(body.password)
  if (pwErr) return res.status(400).json({ message: pwErr })
  const cinema = await findCinema(body.cinema)
  if (!cinema) return res.status(400).json(NO_CINEMA)

  if (await User.exists({ username })) return res.status(409).json(USERNAME_TAKEN)
  if (await User.exists({ email: email.value })) return res.status(409).json(EMAIL_TAKEN)

  try {
    const user = await User.create({
      username,
      name,
      email: email.value,
      password: await bcrypt.hash(body.password, 10),
      role: 'manager',
      cinema: cinema._id,
    })
    res.status(201).json(present(user, cinema))
  } catch (err) {
    // Hai yêu cầu cùng lúc: chỉ mục unique của database là chốt chặn cuối
    if (err.code === 11000) return res.status(409).json(err.keyPattern?.username ? USERNAME_TAKEN : EMAIL_TAKEN)
    throw err
  }
})

// PATCH /api/admin/users/:id/manager { cinema } -> đổi rạp, hoặc cấp lại quyền cho tài khoản chi nhánh đã bị gỡ
exports.assignCinema = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const target = await User.findById(req.params.id).select('username role')
  if (!target) return res.status(404).json(NOT_FOUND)
  if (!isBranchAccount(target)) return res.status(409).json({ message: 'Chỉ tài khoản chi nhánh mới làm quản lý rạp được' })
  const cinema = await findCinema(req.body?.cinema)
  if (!cinema) return res.status(400).json(NO_CINEMA)

  const updated = await User.findByIdAndUpdate(target._id, { role: 'manager', cinema: cinema._id }, { returnDocument: 'after' }).lean()
  if (!updated) return res.status(404).json(NOT_FOUND)
  res.json(present(updated, cinema))
})

// POST /api/admin/users/:id/password { password } -> đặt lại mật khẩu và đăng xuất mọi thiết bị
exports.resetPassword = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const target = await User.findById(req.params.id).select('username role')
  if (!target) return res.status(404).json(NOT_FOUND)
  if (!isBranchAccount(target)) return res.status(409).json({ message: 'Chỉ đặt lại được mật khẩu cho tài khoản chi nhánh' })
  const password = req.body?.password
  const pwErr = passwordError(password)
  if (pwErr) return res.status(400).json({ message: pwErr })

  await User.updateOne({ _id: target._id }, { password: await bcrypt.hash(password, 10), passwordChangedAt: new Date() })
  await refreshTokens.revokeAllForUser(target._id)
  res.json({ message: 'Đã đặt lại mật khẩu' })
})
