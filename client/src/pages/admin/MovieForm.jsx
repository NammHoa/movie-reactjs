import { useState } from 'react'
import api from '../../api/axios'
import { AGE_INFO } from '../../lib/ageRating'
import { STATUS_LABELS } from '../../lib/movie'

const inputCls =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20'

function Row({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}

const toForm = (m) => ({
  title: m?.title ?? '',
  description: m?.description ?? '',
  poster: m?.poster ?? '',
  trailer: m?.trailer ?? '',
  genres: m?.genres?.join(', ') ?? '',
  backdrop: m?.backdrop ?? '',
  ageRating: m?.ageRating ?? '',
  country: m?.country ?? '',
  formats: m?.formats?.join(', ') ?? '',
  duration: m?.duration ?? '',
  releaseDate: m?.releaseDate ? m.releaseDate.slice(0, 10) : '',
  status: m?.status ?? 'coming_soon',
})

// Form thêm / sửa phim (hiện trong cửa sổ nổi). movie = null: thêm mới.
export default function MovieForm({ movie, onClose, onSaved }) {
  const [form, setForm] = useState(() => toForm(movie))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = { ...form, duration: Number(form.duration) }
      if (movie) await api.put(`/movies/${movie._id}`, payload)
      else await api.post('/movies', payload)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể lưu phim')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <form onSubmit={submit} className="my-8 w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-5 text-xl font-bold">{movie ? 'Sửa phim' : 'Thêm phim mới'}</h2>

        <div className="space-y-4">
          <Row label="Tên phim *">
            <input className={inputCls} value={form.title} onChange={set('title')} required autoFocus />
          </Row>
          <Row label="Mô tả">
            <textarea className={inputCls} rows={3} value={form.description} onChange={set('description')} />
          </Row>
          <Row label="Đường dẫn poster (URL ảnh)">
            <input className={inputCls} value={form.poster} onChange={set('poster')} placeholder="https://..." />
          </Row>
          <Row label="Đường dẫn ảnh ngang (16:9, dùng cho banner và trang phim)">
            <input className={inputCls} value={form.backdrop} onChange={set('backdrop')} placeholder="https://..." />
          </Row>
          <Row label="Đường dẫn trailer (YouTube hoặc file .mp4)">
            <input className={inputCls} value={form.trailer} onChange={set('trailer')} placeholder="https://..." />
          </Row>
          <Row label="Thể loại (cách nhau bằng dấu phẩy)">
            <input className={inputCls} value={form.genres} onChange={set('genres')} placeholder="Hành động, Phiêu lưu" />
          </Row>
          <Row label="Loại chiếu (cách nhau bằng dấu phẩy)">
            <input className={inputCls} value={form.formats} onChange={set('formats')} placeholder="2D, Phụ đề tiếng Anh" />
          </Row>
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Độ tuổi">
              <select className={inputCls} value={form.ageRating} onChange={set('ageRating')}>
                <option value="">Không ghi</option>
                {Object.entries(AGE_INFO).map(([code, { label }]) => (
                  <option key={code} value={code}>{code} — {label}</option>
                ))}
              </select>
            </Row>
            <Row label="Quốc gia">
              <input className={inputCls} value={form.country} onChange={set('country')} maxLength={60} placeholder="Việt Nam" />
            </Row>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Row label="Thời lượng (phút) *">
              <input className={inputCls} type="number" min="1" max="600" value={form.duration} onChange={set('duration')} required />
            </Row>
            <Row label="Ngày khởi chiếu">
              <input className={inputCls} type="date" value={form.releaseDate} onChange={set('releaseDate')} />
            </Row>
            <Row label="Trạng thái">
              <select className={inputCls} value={form.status} onChange={set('status')}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Row>
          </div>
        </div>

        {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  )
}
