const Coupon = require('../models/Coupon')
const { CODE_RE, statusOf } = require('../services/coupons')
const { isId, wrap } = require('../utils/http')

const NOT_FOUND = { message: 'Không tìm thấy mã giảm giá' }
const MAX_MONEY = 10_000_000
const MAX_LIMIT = 100

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max

const date = (v) => {
  if (v === null || v === undefined || v === '') return { value: null }
  const d = new Date(v)
  // Chấp nhận chuỗi từ client, hoặc Date lấy từ database khi cập nhật; không nhận số hay object lạ
  return (typeof v === 'string' || v instanceof Date) && !isNaN(d) ? { value: d } : { error: true }
}

// Kiểm tra toàn bộ một mã (đủ các trường) và chỉ giữ các trường được phép.
// Khi cập nhật, nơi gọi gộp dữ liệu cũ với dữ liệu mới rồi mới kiểm tra, để các quy tắc liên quan nhiều trường luôn đúng.
function clean(input, { creating }) {
  const data = {}

  if (creating) {
    data.code = typeof input.code === 'string' ? input.code.trim().toUpperCase() : ''
    if (!CODE_RE.test(data.code)) return { error: 'Mã gồm 4-20 ký tự: chữ, số, dấu gạch ngang hoặc gạch dưới' }
  }

  if (!['percent', 'fixed'].includes(input.type)) return { error: 'Loại giảm giá không hợp lệ' }
  data.type = input.type

  if (data.type === 'percent') {
    if (!isInt(input.value, 1, 100)) return { error: 'Phần trăm giảm phải là số nguyên từ 1 đến 100' }
    if (input.maxDiscount != null && !isInt(input.maxDiscount, 1000, MAX_MONEY)) {
      return { error: 'Mức giảm tối đa phải từ 1.000đ đến 10.000.000đ' }
    }
    data.maxDiscount = input.maxDiscount ?? null
  } else {
    if (!isInt(input.value, 1000, MAX_MONEY)) return { error: 'Số tiền giảm phải từ 1.000đ đến 10.000.000đ' }
    data.maxDiscount = null
  }
  data.value = input.value

  data.minOrder = input.minOrder ?? 0
  if (!isInt(data.minOrder, 0, MAX_MONEY)) return { error: 'Đơn tối thiểu phải từ 0đ đến 10.000.000đ' }

  const starts = date(input.startsAt)
  const expires = date(input.expiresAt)
  if (starts.error || expires.error) return { error: 'Ngày bắt đầu hoặc ngày hết hạn không hợp lệ' }
  data.startsAt = starts.value
  data.expiresAt = expires.value
  if (data.startsAt && data.expiresAt && data.expiresAt <= data.startsAt) {
    return { error: 'Ngày hết hạn phải sau ngày bắt đầu' }
  }
  if (creating && data.expiresAt && data.expiresAt <= new Date()) {
    return { error: 'Ngày hết hạn phải ở tương lai' }
  }

  data.usageLimit = input.usageLimit ?? null
  if (data.usageLimit !== null && !isInt(data.usageLimit, 1, 1_000_000)) {
    return { error: 'Số lượt dùng phải là số nguyên từ 1 đến 1.000.000' }
  }

  data.active = input.active ?? true
  if (typeof data.active !== 'boolean') return { error: 'Trạng thái bật/tắt không hợp lệ' }

  return { data }
}

const present = (coupon) => {
  const obj = coupon.toObject ? coupon.toObject() : coupon
  delete obj.__v
  return { ...obj, status: statusOf(obj) }
}

// GET /api/admin/coupons?q=summer&page=1&limit=20
exports.list = wrap(async (req, res) => {
  const { q } = req.query
  const num = (v, fallback, max) => {
    if (v === undefined) return fallback
    const n = typeof v === 'string' && /^\d{1,6}$/.test(v) ? Number(v) : NaN
    return n >= 1 && n <= max ? n : null
  }
  const page = num(req.query.page, 1, 100000)
  const limit = num(req.query.limit, 20, MAX_LIMIT)
  if (page === null || limit === null) return res.status(400).json({ message: 'Trang hoặc số dòng không hợp lệ' })
  if (q !== undefined && (typeof q !== 'string' || q.length > 20)) {
    return res.status(400).json({ message: 'Từ khóa tìm kiếm không hợp lệ (tối đa 20 ký tự)' })
  }

  const filter = q?.trim() ? { code: new RegExp(escapeRegex(q.trim()), 'i') } : {}
  const [total, items] = await Promise.all([
    Coupon.countDocuments(filter),
    Coupon.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ])
  res.json({ items: items.map(present), page, limit, total, pages: Math.ceil(total / limit) })
})

exports.getOne = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const coupon = await Coupon.findById(req.params.id)
  if (!coupon) return res.status(404).json(NOT_FOUND)
  res.json(present(coupon))
})

// POST /api/admin/coupons
exports.create = wrap(async (req, res) => {
  const { data, error } = clean(req.body ?? {}, { creating: true })
  if (error) return res.status(400).json({ message: error })
  try {
    res.status(201).json(present(await Coupon.create(data)))
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Mã này đã tồn tại' })
    throw err
  }
})

// PUT /api/admin/coupons/:id: gửi các trường muốn đổi; mã không đổi được sau khi tạo
exports.update = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const coupon = await Coupon.findById(req.params.id)
  if (!coupon) return res.status(404).json(NOT_FOUND)

  const body = req.body ?? {}
  if (body.code !== undefined && String(body.code).trim().toUpperCase() !== coupon.code) {
    return res.status(400).json({ message: 'Không thể đổi mã sau khi đã tạo, hãy tạo mã mới' })
  }

  const { data, error } = clean({ ...coupon.toObject(), ...body }, { creating: false })
  if (error) return res.status(400).json({ message: error })
  if (data.usageLimit !== null && data.usageLimit < coupon.usedCount) {
    return res.status(400).json({ message: `Mã đã được dùng ${coupon.usedCount} lượt, giới hạn không được thấp hơn` })
  }

  const updated = await Coupon.findByIdAndUpdate(coupon._id, data, { returnDocument: 'after' })
  res.json(present(updated))
})

// DELETE /api/admin/coupons/:id: mã đã có người dùng thì chỉ tắt được, để còn lịch sử đối chiếu
exports.remove = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const deleted = await Coupon.findOneAndDelete({ _id: req.params.id, usedCount: 0 })
  if (deleted) return res.json({ message: 'Đã xóa mã giảm giá' })
  if (!(await Coupon.exists({ _id: req.params.id }))) return res.status(404).json(NOT_FOUND)
  res.status(409).json({ message: 'Mã đã có người dùng nên không xóa được, hãy tắt mã thay vì xóa' })
})
