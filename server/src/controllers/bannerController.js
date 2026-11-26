const banners = require('../services/banners')
const { wrap } = require('../utils/http')

// GET /api/banners (công khai): chỉ các mục đang được hiện
exports.list = wrap(async (req, res) => {
  res.json(await banners.visible())
})

exports.adminList = wrap(async (req, res) => {
  res.json(await banners.adminView())
})

// Ba lệnh dưới đều trả lại danh sách mới để trang admin cập nhật ngay
exports.add = wrap(async (req, res) => {
  const { error } = await banners.add(req.body?.movieId)
  if (error) return res.status(error.status).json({ message: error.message })
  res.status(201).json(await banners.adminView())
})

exports.remove = wrap(async (req, res) => {
  if (!(await banners.remove(req.params.movieId))) return res.status(404).json({ message: 'Phim này không có trên banner' })
  res.json(await banners.adminView())
})

exports.reorder = wrap(async (req, res) => {
  if (!(await banners.reorder(req.body?.ids))) {
    return res.status(409).json({ message: 'Danh sách banner vừa thay đổi, vui lòng tải lại' })
  }
  res.json(await banners.adminView())
})
