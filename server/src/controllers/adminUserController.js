const Booking = require('../models/Booking')
const User = require('../models/User')
const { isId, wrap } = require('../utils/http')

const ROLES = ['user', 'admin']
const MAX_LIMIT = 100
const MAX_QUERY = 50
const NOT_FOUND = { message: 'Không tìm thấy người dùng' }

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const intParam = (v, fallback, min, max) => {
  if (v === undefined) return fallback
  if (typeof v !== 'string' || !/^\d{1,6}$/.test(v)) return null
  const n = Number(v)
  return n >= min && n <= max ? n : null
}

const FIELDS = 'name email phone role createdAt'

// Gắn số đơn đã thanh toán và tổng chi tiêu của từng người trong danh sách
const withStats = async (users) => {
  if (users.length === 0) return []
  const rows = await Booking.aggregate([
    { $match: { user: { $in: users.map((u) => u._id) }, paymentStatus: 'paid' } },
    { $group: { _id: '$user', paidBookings: { $sum: 1 }, totalSpent: { $sum: '$totalPrice' } } },
  ])
  const byUser = new Map(rows.map((r) => [String(r._id), r]))
  return users.map((u) => {
    const s = byUser.get(String(u._id))
    return { ...u, paidBookings: s?.paidBookings ?? 0, totalSpent: s?.totalSpent ?? 0 }
  })
}

// GET /api/admin/users?role=admin&q=nam&page=1&limit=20
// q tìm theo tên, email hoặc số điện thoại. Kèm số lượng theo quyền để hiện trên các tab.
exports.list = wrap(async (req, res) => {
  const { role, q } = req.query
  const page = intParam(req.query.page, 1, 1, 100000)
  const limit = intParam(req.query.limit, 20, 1, MAX_LIMIT)
  if (page === null || limit === null) return res.status(400).json({ message: 'Trang hoặc số dòng không hợp lệ' })
  if (role !== undefined && role !== 'all' && !ROLES.includes(role)) {
    return res.status(400).json({ message: 'Quyền không hợp lệ' })
  }
  if (q !== undefined && (typeof q !== 'string' || q.length > MAX_QUERY)) {
    return res.status(400).json({ message: `Từ khóa tìm kiếm không hợp lệ (tối đa ${MAX_QUERY} ký tự)` })
  }

  const filter = {}
  if (ROLES.includes(role)) filter.role = role
  const term = q?.trim()
  if (term) {
    const pattern = escapeRegex(term)
    filter.$or = [{ name: new RegExp(pattern, 'i') }, { email: new RegExp(pattern, 'i') }, { phone: new RegExp(pattern) }]
  }

  const [total, users, byRole] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).select(FIELDS).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
  ])
  const counts = { admin: 0, user: 0 }
  for (const r of byRole) if (r._id in counts) counts[r._id] = r.n

  res.json({
    items: await withStats(users),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    counts: { all: counts.admin + counts.user, ...counts },
  })
})

// PATCH /api/admin/users/:id/role  { role: 'admin' | 'user' }
exports.setRole = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const { role } = req.body ?? {}
  if (!ROLES.includes(role)) return res.status(400).json({ message: 'Quyền không hợp lệ' })

  // Không cho tự đổi quyền của chính mình: admin đang thao tác luôn còn lại, hệ thống không bao giờ hết admin
  if (req.params.id === req.user.id) {
    return res.status(409).json({ message: 'Bạn không thể tự đổi quyền của chính mình' })
  }

  const target = await User.findById(req.params.id).select(FIELDS).lean()
  if (!target) return res.status(404).json(NOT_FOUND)
  if (target.role === role) return res.json({ ...target, unchanged: true })

  // Chỉ đổi khi quyền hiện tại vẫn như vừa đọc, tránh ghi đè khi hai admin cùng thao tác
  const updated = await User.findOneAndUpdate(
    { _id: target._id, role: target.role },
    { role },
    { returnDocument: 'after' },
  )
    .select(FIELDS)
    .lean()
  if (!updated) return res.status(409).json({ message: 'Quyền của người dùng này vừa thay đổi, vui lòng tải lại' })

  // Hai admin hạ quyền nhau cùng lúc có thể làm hết admin: nếu vậy thì hoàn tác để luôn còn ít nhất một admin
  if (role === 'user' && (await User.countDocuments({ role: 'admin' })) === 0) {
    await User.updateOne({ _id: target._id }, { role: 'admin' })
    return res.status(409).json({ message: 'Hệ thống phải còn ít nhất một admin' })
  }

  res.json(updated)
})
