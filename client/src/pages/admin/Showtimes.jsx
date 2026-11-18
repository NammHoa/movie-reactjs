import { useCallback, useEffect, useState } from 'react'
import api from '../../api/axios'
import { formatDateTime, formatPrice, toLocalInput } from '../../lib/movie'
import { ErrorText, FormModal, PageHeader, Row, inputCls, primaryBtn } from './ui'

function ShowtimeForm({ item, movies, cinemas, rooms, onClose, onSaved }) {
  const [form, setForm] = useState({
    movie: item?.movie?._id ?? '',
    cinema: item?.room?.cinema?._id ?? '',
    room: item?.room?._id ?? '',
    startTime: item ? toLocalInput(item.startTime) : '',
    price: item?.price ?? 90000,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const roomOptions = rooms.filter((r) => r.cinema?._id === form.cinema)
  const movieOptions = movies.filter((m) => m.status !== 'ended' || m._id === form.movie)
  const picked = movies.find((m) => m._id === form.movie)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const start = new Date(form.startTime)
    if (isNaN(start)) return setError('Vui lòng chọn giờ chiếu')
    setSaving(true)
    const payload = { movie: form.movie, room: form.room, startTime: start.toISOString(), price: Number(form.price) }
    try {
      if (item) await api.put(`/showtimes/${item._id}`, payload)
      else await api.post('/showtimes', payload)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể lưu suất chiếu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal title={item ? 'Sửa suất chiếu' : 'Thêm suất chiếu'} onSubmit={submit} onClose={onClose} saving={saving} error={error}>
      <Row label="Phim *">
        <select className={inputCls} value={form.movie} onChange={set('movie')} required>
          <option value="">— Chọn phim —</option>
          {movieOptions.map((m) => (
            <option key={m._id} value={m._id}>{m.title} ({m.duration} phút)</option>
          ))}
        </select>
      </Row>
      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Rạp *">
          <select
            className={inputCls}
            value={form.cinema}
            onChange={(e) => setForm((f) => ({ ...f, cinema: e.target.value, room: '' }))}
            required
          >
            <option value="">— Chọn rạp —</option>
            {cinemas.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </Row>
        <Row label="Phòng chiếu *">
          <select className={inputCls} value={form.room} onChange={set('room')} disabled={!form.cinema} required>
            <option value="">— Chọn phòng —</option>
            {roomOptions.map((r) => (
              <option key={r._id} value={r._id}>{r.name} ({r.rows * r.seatsPerRow} ghế)</option>
            ))}
          </select>
        </Row>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Giờ chiếu *">
          <input className={inputCls} type="datetime-local" value={form.startTime} onChange={set('startTime')} required />
        </Row>
        <Row label="Giá vé (VND) *">
          <input className={inputCls} type="number" min="1000" max="5000000" step="1000" value={form.price} onChange={set('price')} required />
        </Row>
      </div>
      {picked && form.startTime && !isNaN(new Date(form.startTime)) && (
        <p className="text-sm text-gray-500">
          Dự kiến kết thúc: <b>{formatDateTime(new Date(form.startTime).getTime() + picked.duration * 60000)}</b>. Các suất trong
          cùng phòng phải cách nhau ít nhất 15 phút.
        </p>
      )}
    </FormModal>
  )
}

export default function Showtimes() {
  const [showtimes, setShowtimes] = useState([])
  const [movies, setMovies] = useState([])
  const [cinemas, setCinemas] = useState([])
  const [rooms, setRooms] = useState([])
  const [movieFilter, setMovieFilter] = useState('')
  const [includePast, setIncludePast] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(undefined) // undefined: đóng, null: thêm mới, object: sửa

  const load = useCallback(async () => {
    try {
      const params = {}
      if (movieFilter) params.movie = movieFilter
      if (includePast) params.includePast = 1
      const { data } = await api.get('/showtimes', { params })
      setShowtimes(data)
      setError('')
    } catch {
      setError('Không thể tải suất chiếu')
    } finally {
      setLoading(false)
    }
  }, [movieFilter, includePast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  useEffect(() => {
    Promise.all([api.get('/movies'), api.get('/cinemas'), api.get('/rooms')])
      .then(([m, c, r]) => {
        setMovies(m.data)
        setCinemas(c.data)
        setRooms(r.data)
      })
      .catch(() => setError('Không thể tải danh sách phim/rạp'))
  }, [])

  const remove = async (s) => {
    if (!window.confirm(`Xóa suất chiếu "${s.movie?.title}" lúc ${formatDateTime(s.startTime)}?`)) return
    try {
      await api.delete(`/showtimes/${s._id}`)
      setError('')
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa suất chiếu')
    }
  }

  const missing = movies.length === 0 || rooms.length === 0

  return (
    <div>
      <PageHeader
        title="Suất chiếu"
        action={
          <button onClick={() => setEditing(null)} disabled={missing} className={primaryBtn} title={missing ? 'Cần có phim và phòng chiếu trước' : ''}>
            + Thêm suất chiếu
          </button>
        }
      />
      <ErrorText message={error} />
      {missing && !loading && (
        <p className="mb-4 rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Cần tạo ít nhất một phim (mục Quản lý phim) và một phòng chiếu (mục Rạp & phòng) trước khi thêm suất chiếu.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
        <select
          value={movieFilter}
          onChange={(e) => {
            setLoading(true)
            setMovieFilter(e.target.value)
          }}
          className="max-w-full rounded border border-gray-300 bg-white px-3 py-2"
        >
          <option value="">Tất cả phim</option>
          {movies.map((m) => (
            <option key={m._id} value={m._id}>{m.title}</option>
          ))}
        </select>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includePast}
            onChange={(e) => {
              setLoading(true)
              setIncludePast(e.target.checked)
            }}
          />
          Hiện cả suất đã chiếu
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Phim</th>
              <th className="px-4 py-3">Rạp / Phòng</th>
              <th className="px-4 py-3">Giờ chiếu</th>
              <th className="px-4 py-3">Giá vé</th>
              <th className="px-4 py-3">Ghế đã đặt</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Đang tải...</td></tr>}
            {!loading && showtimes.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Chưa có suất chiếu nào.</td></tr>
            )}
            {showtimes.map((s) => (
              <tr key={s._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{s.movie?.title}</td>
                <td className="px-4 py-3">
                  {s.room?.cinema?.name}
                  <span className="text-gray-500"> — {s.room?.name}</span>
                </td>
                <td className="px-4 py-3">{formatDateTime(s.startTime)}</td>
                <td className="px-4 py-3">{formatPrice(s.price)}</td>
                <td className="px-4 py-3">{s.bookedSeats.length}/{(s.room?.rows ?? 0) * (s.room?.seatsPerRow ?? 0)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditing(s)} className="mr-3 text-blue-600 hover:underline">Sửa</button>
                  <button onClick={() => remove(s)} className="text-red-600 hover:underline">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <ShowtimeForm
          item={editing}
          movies={movies}
          cinemas={cinemas}
          rooms={rooms}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined)
            load()
          }}
        />
      )}
    </div>
  )
}
