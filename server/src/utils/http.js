const str = (v) => (typeof v === 'string' ? v.trim() : '')

// Chuỗi 24 ký tự hex (ObjectId hợp lệ). Chặn luôn trường hợp client gửi object thay vì chuỗi.
const isId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v)

// Bọc handler: lỗi bất ngờ trả JSON 500 thay vì trang HTML lỗi
const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Lỗi máy chủ' })
  }
}

module.exports = { str, isId, wrap }
