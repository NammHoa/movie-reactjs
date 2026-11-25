const Booking = require('../models/Booking')
const Refund = require('../models/Refund')
const { isId, wrap } = require('../utils/http')
const refunds = require('../services/refunds')
const vnpay = require('../services/vnpay')

const NOT_FOUND = { message: 'Không tìm thấy khoản hoàn tiền' }
const OPEN = ['pending', 'processing', 'failed'] // khoản chưa xong
const MAX_LIMIT = 100

const POPULATE = [
  { path: 'user', select: 'name email' },
  { path: 'requestedBy', select: 'name' },
  { path: 'resolvedBy', select: 'name' },
  {
    path: 'booking',
    select: 'code seats totalPrice paymentStatus showtime',
    populate: { path: 'showtime', select: 'startTime movie', populate: { path: 'movie', select: 'title' } },
  },
]

const intParam = (v, fallback, min, max) => {
  if (v === undefined) return fallback
  if (typeof v !== 'string' || !/^\d{1,6}$/.test(v)) return null
  const n = Number(v)
  return n >= min && n <= max ? n : null
}

// Khoản đang xử lý quá lâu coi như bị treo: cho thử lại hoặc đánh dấu thủ công như các khoản thất bại
const isStale = (r, now = new Date()) => r.status === 'processing' && r.lastAttemptAt && now - new Date(r.lastAttemptAt) > refunds.STALE_MS

// Cho admin xem đủ chi tiết kể cả lý do lỗi và mã tham chiếu của cổng thanh toán
// Cổng này có đang tắt hoàn tiền tự động không (khi đó chỉ còn cách hoàn thủ công)
const autoOff = (r) => r.provider === 'vnpay' && !vnpay.refundApiEnabled()

function present(refund) {
  const r = refund.toObject ? refund.toObject() : refund
  const open = OPEN.includes(r.status)
  const stale = isStale(r)
  const manualOnly = open && autoOff(r)
  return {
    ...r,
    __v: undefined,
    stale,
    manualOnly,
    // pending kèm lý do lỗi = chưa rõ cổng đã hoàn hay chưa: thử lại có thể bị cổng từ chối vì trùng, nên giao diện cần cảnh báo.
    // Riêng "manual_required" là do ta chủ động không gọi cổng, nên không có gì chưa rõ.
    unknownOutcome: r.status === 'pending' && !!r.failReason && r.failReason !== refunds.MANUAL_REQUIRED,
    canRetry: !manualOnly && (r.status === 'pending' || r.status === 'failed' || stale),
    canResolve: open && (r.status !== 'processing' || stale),
  }
}

// GET /api/admin/refunds?status=open|pending|processing|failed|success|all&q=MÃVÉ&page=1&limit=20
exports.list = wrap(async (req, res) => {
  const { q } = req.query
  const status = req.query.status ?? 'open'
  const page = intParam(req.query.page, 1, 1, 100000)
  const limit = intParam(req.query.limit, 20, 1, MAX_LIMIT)
  if (page === null || limit === null) return res.status(400).json({ message: 'Trang hoặc số dòng không hợp lệ' })
  if (typeof status !== 'string' || !['open', 'all', 'pending', 'processing', 'failed', 'success'].includes(status)) {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ' })
  }
  if (q !== undefined && (typeof q !== 'string' || q.length > 20)) return res.status(400).json({ message: 'Từ khóa tìm kiếm không hợp lệ (tối đa 20 ký tự)' })

  const filter = {}
  if (status === 'open') filter.status = { $in: OPEN }
  else if (status !== 'all') filter.status = status
  const term = q?.trim().toUpperCase()
  if (term) {
    const codes = await Booking.find({ code: new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).select('_id').limit(200).lean()
    filter.booking = { $in: codes.map((b) => b._id) }
  }

  const [total, items, byStatus] = await Promise.all([
    Refund.countDocuments(filter),
    Refund.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate(POPULATE),
    Refund.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ])
  const counts = { pending: 0, processing: 0, failed: 0, success: 0 }
  for (const row of byStatus) counts[row._id] = row.n

  res.json({
    items: items.map(present),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    counts: { open: counts.pending + counts.processing + counts.failed, success: counts.success, all: counts.pending + counts.processing + counts.failed + counts.success },
    autoRefund: { vnpay: vnpay.refundApiEnabled() },
  })
})

async function findOne(id) {
  return isId(id) ? Refund.findById(id) : null
}

// POST /api/admin/refunds/:id/retry -> gọi lại cổng thanh toán cho khoản chưa xong
exports.retry = wrap(async (req, res) => {
  const refund = await findOne(req.params.id)
  if (!refund) return res.status(404).json(NOT_FOUND)
  if (refund.status === 'success') return res.status(409).json({ message: 'Khoản này đã hoàn xong' })
  if (autoOff(refund)) {
    return res.status(409).json({ message: 'Hoàn tiền tự động qua VNPay đang tắt (VNPAY_REFUND_API=off). Hãy hoàn trực tiếp trên cổng VNPay rồi bấm "Đánh dấu đã hoàn thủ công".' })
  }

  const result = await refunds.executeRefund(refund._id, { ip: req.ip, createBy: req.account.email })
  const fresh = await Refund.findById(refund._id).populate(POPULATE)
  if (result.outcome === 'busy') return res.status(409).json({ message: 'Khoản này đang được xử lý, vui lòng thử lại sau ít phút', refund: present(fresh) })
  res.json({ outcome: result.outcome, refund: present(fresh) })
})

const cleanText = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined)

// POST /api/admin/refunds/:id/resolve { reference?, note? } -> đánh dấu đã hoàn tiền thủ công
exports.resolve = wrap(async (req, res) => {
  const refund = await findOne(req.params.id)
  if (!refund) return res.status(404).json(NOT_FOUND)
  const body = req.body ?? {}
  for (const k of ['reference', 'note']) {
    if (body[k] !== undefined && body[k] !== null && typeof body[k] !== 'string') return res.status(400).json({ message: 'Thông tin ghi chú không hợp lệ' })
  }
  if (refund.status === 'success') return res.status(409).json({ message: 'Khoản này đã hoàn xong' })

  const result = await refunds.resolveManually(refund._id, { id: req.user.id }, { reference: cleanText(body.reference, 100), note: cleanText(body.note, 300) })
  const fresh = await Refund.findById(refund._id).populate(POPULATE)
  if (result.outcome === 'conflict') return res.status(409).json({ message: 'Khoản này đang được xử lý hoặc vừa thay đổi, vui lòng tải lại', refund: present(fresh) })
  res.json({ refund: present(fresh) })
})

exports.present = present
exports.POPULATE = POPULATE
