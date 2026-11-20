import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/errors'
import { formatDate, formatRating } from '../lib/movie'
import { StarInput, Stars } from './Stars'

const PAGE_SIZE = 10
const MAX_COMMENT = 500

function Summary({ summary }) {
  const { average, count, breakdown } = summary
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-8">
      <div className="text-center sm:min-w-28">
        <p className="text-4xl font-bold">{count ? formatRating(average) : '—'}</p>
        <Stars value={average} className="text-xl" />
        <p className="mt-1 text-sm text-gray-500">{count ? `${count} đánh giá` : 'Chưa có đánh giá'}</p>
      </div>
      <ul className="flex-1 space-y-1 text-sm">
        {[5, 4, 3, 2, 1].map((n) => (
          <li key={n} className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-gray-600">{n} sao</span>
            <span className="h-2 flex-1 overflow-hidden rounded bg-gray-200">
              <span className="block h-full bg-amber-400" style={{ width: count ? `${(breakdown[n] / count) * 100}%` : 0 }} />
            </span>
            <span className="w-8 shrink-0 text-right text-gray-500">{breakdown[n]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ReviewForm({ initial, onSaved, onCancel, movieId }) {
  const [rating, setRating] = useState(initial?.rating ?? 0)
  const [comment, setComment] = useState(initial?.comment ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!rating) return setError('Vui lòng chọn số sao')
    setSaving(true)
    setError('')
    try {
      await api.put(`/movies/${movieId}/reviews`, { rating, comment })
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Không thể gửi đánh giá'))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg bg-white p-4 shadow-sm">
      <p className="mb-1 font-semibold">{initial ? 'Sửa đánh giá của bạn' : 'Đánh giá của bạn'}</p>
      <StarInput
        value={rating}
        onChange={(n) => {
          setRating(n)
          setError('')
        }}
        disabled={saving}
      />
      <label htmlFor="review-comment" className="mb-1 mt-3 block text-sm text-gray-600">Nhận xét (không bắt buộc)</label>
      <textarea
        id="review-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={MAX_COMMENT}
        rows={3}
        disabled={saving}
        placeholder="Bạn thấy bộ phim thế nào?"
        className="w-full rounded border border-gray-300 px-3 py-2 text-base focus:border-gray-900 focus:outline-none"
      />
      <p className="mt-1 text-right text-xs text-gray-400">{comment.length}/{MAX_COMMENT}</p>
      {error && <p role="alert" className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={saving} className="h-10 rounded bg-brand px-5 font-bold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {saving ? 'Đang gửi...' : initial ? 'Lưu thay đổi' : 'Gửi đánh giá'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={saving} className="h-10 rounded border border-gray-300 px-4 font-semibold text-gray-600 hover:bg-gray-50">
            Hủy
          </button>
        )}
      </div>
    </form>
  )
}

export default function MovieReviews({ movieId, onSummary }) {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [me, setMe] = useState(null) // { canReview, review }
  const [status, setStatus] = useState('loading') // loading | ok | error
  const [editing, setEditing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const isAdmin = user?.role === 'admin'
  const loggedIn = !!user // phụ thuộc vào cờ này chứ không phải object user, vì object được tạo lại mỗi lần cập nhật hồ sơ

  const load = useCallback(async () => {
    try {
      const [list, mine] = await Promise.all([
        api.get(`/movies/${movieId}/reviews`, { params: { page: 1, limit: PAGE_SIZE } }),
        loggedIn ? api.get(`/movies/${movieId}/reviews/me`) : Promise.resolve(null),
      ])
      setSummary({ average: list.data.average, count: list.data.count, breakdown: list.data.breakdown })
      setItems(list.data.items)
      setPage(1)
      setPages(list.data.pages)
      setMe(mine?.data ?? null)
      setStatus('ok')
      onSummary?.({ average: list.data.average, count: list.data.count })
    } catch {
      setStatus('error')
    }
  }, [movieId, loggedIn, onSummary])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const { data } = await api.get(`/movies/${movieId}/reviews`, { params: { page: page + 1, limit: PAGE_SIZE } })
      // Có đánh giá mới chen vào giữa lúc đang xem sẽ làm trùng dòng, nên lọc theo id
      setItems((old) => [...old, ...data.items.filter((r) => !old.some((x) => x._id === r._id))])
      setPage(data.page)
      setPages(data.pages)
    } catch (err) {
      setError(errorMessage(err, 'Không thể tải thêm đánh giá'))
    } finally {
      setLoadingMore(false)
    }
  }

  const remove = async (review, own) => {
    const msg = own ? 'Xóa đánh giá của bạn?' : `Xóa đánh giá của ${review.user.name}?`
    if (!window.confirm(msg)) return
    setBusyId(review._id)
    setError('')
    try {
      await api.delete(`/reviews/${review._id}`)
      setEditing(false)
      await load()
    } catch (err) {
      setError(errorMessage(err, 'Không thể xóa đánh giá'))
    } finally {
      setBusyId(null)
    }
  }

  const saved = async () => {
    setEditing(false)
    await load()
  }

  if (status === 'loading') return <p className="text-gray-500">Đang tải đánh giá...</p>
  if (status === 'error') return <p className="text-red-600">Không thể tải đánh giá</p>

  const mine = me?.review

  return (
    <div className="space-y-4">
      <Summary summary={summary} />

      {!loggedIn ? (
        <p className="rounded-lg bg-white p-4 text-sm text-gray-600 shadow-sm">
          <Link to="/login" state={{ from: `/movies/${movieId}` }} className="font-semibold text-brand hover:underline">Đăng nhập</Link>{' '}
          để đánh giá phim này.
        </p>
      ) : !me ? null : mine && !editing ? (
        <div className="rounded-lg border border-brand/30 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Đánh giá của bạn</p>
            <Stars value={mine.rating} className="text-lg" />
          </div>
          {mine.comment && <p className="mt-2 whitespace-pre-line break-words text-gray-700">{mine.comment}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={() => setEditing(true)} className="h-9 rounded border border-gray-300 px-4 text-sm font-semibold hover:bg-gray-50">Sửa</button>
            <button
              onClick={() => remove(mine, true)}
              disabled={busyId === mine._id}
              className="h-9 rounded border border-red-300 px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Xóa
            </button>
          </div>
        </div>
      ) : me.canReview ? (
        <ReviewForm key={mine?._id ?? 'new'} movieId={movieId} initial={mine} onSaved={saved} onCancel={mine ? () => setEditing(false) : undefined} />
      ) : (
        <p className="rounded-lg bg-white p-4 text-sm text-gray-600 shadow-sm">
          Bạn có thể đánh giá sau khi xem phim này (vé đã thanh toán và suất chiếu đã kết thúc).
        </p>
      )}

      {error && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((r) => {
            const own = r._id === mine?._id
            return (
              <li key={r._id} className="rounded-lg bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="min-w-0 break-words font-semibold">
                    {r.user.name}
                    {own && <span className="ml-2 rounded bg-brand/10 px-1.5 py-0.5 text-xs font-semibold text-brand">Bạn</span>}
                  </p>
                  <Stars value={r.rating} />
                </div>
                <p className="text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                {r.comment && <p className="mt-2 whitespace-pre-line break-words text-gray-700">{r.comment}</p>}
                {isAdmin && !own && (
                  <button
                    onClick={() => remove(r, false)}
                    disabled={busyId === r._id}
                    className="mt-2 text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    Xóa đánh giá (admin)
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {page < pages && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="mx-auto block h-10 rounded border border-gray-300 bg-white px-6 font-semibold hover:bg-gray-50 disabled:opacity-50"
        >
          {loadingMore ? 'Đang tải...' : 'Xem thêm đánh giá'}
        </button>
      )}
    </div>
  )
}
