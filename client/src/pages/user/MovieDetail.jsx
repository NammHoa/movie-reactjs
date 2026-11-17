import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/axios'
import { Poster } from '../../components/MovieCard'
import { STATUS_LABELS, dateKey, dayLabel, formatDate, formatPrice, formatTime } from '../../lib/movie'

export default function MovieDetail() {
  const { id } = useParams()
  const [movie, setMovie] = useState(null)
  const [showtimes, setShowtimes] = useState([])
  const [status, setStatus] = useState('loading') // loading | ok | notfound | error
  const [day, setDay] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.get(`/movies/${id}`), api.get('/showtimes', { params: { movie: id } })])
      .then(([m, s]) => {
        if (cancelled) return
        setMovie(m.data)
        setShowtimes(s.data)
        setStatus('ok')
      })
      .catch((err) => !cancelled && setStatus(err.response?.status === 404 ? 'notfound' : 'error'))
    return () => {
      cancelled = true
    }
  }, [id])

  if (status === 'loading') return <p className="p-8 text-center text-gray-500">Đang tải...</p>
  if (status === 'notfound')
    return (
      <div className="p-8 text-center">
        <p className="mb-3 text-gray-600">Không tìm thấy phim này.</p>
        <Link to="/" className="font-semibold text-brand hover:underline">← Về trang chủ</Link>
      </div>
    )
  if (status === 'error') return <p className="p-8 text-center text-red-600">Không thể tải thông tin phim</p>

  const days = [...new Set(showtimes.map((s) => dateKey(s.startTime)))]
  const selected = day && days.includes(day) ? day : days[0]
  const byCinema = {}
  for (const s of showtimes.filter((x) => dateKey(x.startTime) === selected)) {
    const c = s.room?.cinema
    if (!c) continue
    ;(byCinema[c._id] ??= { cinema: c, items: [] }).items.push(s)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/" className="text-sm text-gray-500 hover:text-brand">← Danh sách phim</Link>

      <div className="mt-4 grid gap-8 md:grid-cols-[260px_1fr]">
        <Poster src={movie.poster} alt={movie.title} className="aspect-[2/3] w-full max-w-xs rounded-lg shadow" />
        <div>
          <span className="rounded bg-brand px-2 py-0.5 text-xs font-semibold text-white">{STATUS_LABELS[movie.status]}</span>
          <h1 className="mt-2 text-3xl font-bold">{movie.title}</h1>
          <dl className="mt-4 grid grid-cols-[110px_1fr] gap-y-2 text-sm">
            <dt className="text-gray-500">Thể loại</dt>
            <dd>{movie.genres?.join(', ') || '—'}</dd>
            <dt className="text-gray-500">Thời lượng</dt>
            <dd>{movie.duration} phút</dd>
            <dt className="text-gray-500">Khởi chiếu</dt>
            <dd>{formatDate(movie.releaseDate)}</dd>
          </dl>
          {movie.description && <p className="mt-5 whitespace-pre-line leading-relaxed text-gray-700">{movie.description}</p>}
          {movie.trailer && (
            <a
              href={movie.trailer}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block rounded border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white"
            >
              ▶ Xem trailer
            </a>
          )}
        </div>
      </div>

      <section className="mt-12">
        <h2 className="mb-4 border-l-4 border-brand pl-3 text-2xl font-bold">Lịch chiếu</h2>
        {days.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-gray-500 shadow-sm">Hiện chưa có suất chiếu nào cho phim này.</p>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              {days.map((d) => (
                <button
                  key={d}
                  onClick={() => setDay(d)}
                  className={`rounded px-4 py-2 text-sm font-semibold transition ${
                    d === selected ? 'bg-brand text-white' : 'bg-white text-gray-700 shadow-sm hover:text-brand'
                  }`}
                >
                  {dayLabel(d)}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {Object.values(byCinema).map(({ cinema, items }) => (
                <div key={cinema._id} className="rounded-lg bg-white p-4 shadow-sm">
                  <h3 className="font-bold">{cinema.name}</h3>
                  <p className="mb-3 text-sm text-gray-500">{[cinema.address, cinema.city].filter(Boolean).join(', ')}</p>
                  <div className="flex flex-wrap gap-3">
                    {items.map((s) => (
                      <Link
                        key={s._id}
                        to={`/booking/${s._id}`}
                        className="rounded border border-gray-300 px-4 py-2 text-center transition hover:border-brand hover:text-brand"
                        title={`${s.room?.name} • ${s.room?.rows * s.room?.seatsPerRow} ghế`}
                      >
                        <p className="font-bold">{formatTime(s.startTime)}</p>
                        <p className="text-xs text-gray-500">{s.room?.name} • {formatPrice(s.price)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
