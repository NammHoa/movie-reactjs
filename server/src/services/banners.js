const BannerList = require('../models/BannerList')
const Movie = require('../models/Movie')
const { isId } = require('../utils/http')

const MAX_BANNERS = 8
const KEY = 'home'
const FIELDS = 'title backdrop status releaseDate'

// Lý do một phim trên banner đang không được hiện ở trang chủ (null = đang hiện)
function hiddenReason(movie) {
  if (movie.status !== 'now_showing') return 'not_showing'
  return movie.backdrop ? null : 'no_backdrop'
}

// Phim trên banner theo đúng thứ tự đã xếp; bỏ qua id không còn phim tương ứng
async function bannerMovies() {
  const list = await BannerList.findOne({ key: KEY }).lean()
  const ids = list?.movies ?? []
  const found = await Movie.find({ _id: { $in: ids } }).select(FIELDS).lean()
  const byId = new Map(found.map((m) => [String(m._id), m]))
  return { movies: ids.map((id) => byId.get(String(id))).filter(Boolean), missing: ids.filter((id) => !byId.has(String(id))) }
}

// Gỡ hẳn mục trỏ tới phim đã mất, để nó không chiếm một chỗ mà admin không nhìn thấy
async function prune() {
  const { movies, missing } = await bannerMovies()
  if (missing.length) await BannerList.updateOne({ key: KEY }, { $pull: { movies: { $in: missing } } })
  return movies
}

async function ensureList() {
  try {
    await BannerList.updateOne({ key: KEY }, { $setOnInsert: { movies: [] } }, { upsert: true })
  } catch (err) {
    if (err.code !== 11000) throw err // request khác vừa tạo xong
  }
}

async function visible() {
  const { movies } = await bannerMovies()
  return movies.filter((m) => !hiddenReason(m)).map((m) => ({ _id: m._id, title: m.title, backdrop: m.backdrop }))
}

async function adminView() {
  const movies = await prune()
  const candidates = await Movie.find({ status: 'now_showing', _id: { $nin: movies.map((m) => m._id) } })
    .sort({ releaseDate: -1, title: 1 })
    .select(FIELDS)
    .lean()
  return {
    max: MAX_BANNERS,
    items: movies.map((m) => ({ _id: m._id, title: m.title, backdrop: m.backdrop ?? '', status: m.status, hiddenReason: hiddenReason(m) })),
    candidates: candidates.map((m) => ({ _id: m._id, title: m.title, backdrop: m.backdrop ?? '', eligible: !hiddenReason(m) })),
  }
}

const fail = (status, message) => ({ error: { status, message } })

async function add(movieId) {
  const movie = isId(movieId) ? await Movie.findById(movieId).select(FIELDS).lean() : null
  if (!movie) return fail(404, 'Không tìm thấy phim')
  if (hiddenReason(movie)) return fail(400, 'Chỉ thêm được phim đang chiếu có ảnh ngang')

  await ensureList()
  await prune()
  // Một lệnh nguyên tử: chỉ thêm khi chưa có phim này và vị trí cuối cùng còn trống
  const added = await BannerList.findOneAndUpdate(
    { key: KEY, movies: { $ne: movie._id }, [`movies.${MAX_BANNERS - 1}`]: { $exists: false } },
    { $push: { movies: movie._id } },
    { returnDocument: 'after' },
  )
  if (added) return {}
  const already = await BannerList.exists({ key: KEY, movies: movie._id })
  return fail(409, already ? 'Phim này đã có trên banner' : `Banner đã đủ ${MAX_BANNERS} phim`)
}

async function remove(movieId) {
  if (!isId(movieId)) return false
  const result = await BannerList.updateOne({ key: KEY, movies: movieId }, { $pull: { movies: movieId } })
  return result.modifiedCount > 0
}

// Chỉ nhận đúng cùng tập phim đang có (khác thứ tự). Điều kiện nằm trong lệnh cập nhật nên nếu danh sách
// vừa bị đổi ở nơi khác thì không ghi đè.
async function reorder(ids) {
  if (!Array.isArray(ids) || !ids.every(isId) || new Set(ids).size !== ids.length) return false
  await ensureList()
  await prune()
  const match = ids.length ? { $size: ids.length, $all: ids } : { $size: 0 }
  return !!(await BannerList.findOneAndUpdate({ key: KEY, movies: match }, { movies: ids }))
}

const removeMovie = (id) => BannerList.updateOne({ key: KEY }, { $pull: { movies: id } })

module.exports = { MAX_BANNERS, hiddenReason, visible, adminView, add, remove, reorder, removeMovie }
