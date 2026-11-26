import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/axios'
import MovieInfo from '../../components/MovieInfo'
import MovieReviews from '../../components/MovieReviews'
import TrailerHero from '../../components/TrailerHero'
import { dateKey, dayLabel, formatPrice, formatTime } from '../../lib/movie'

export default function MovieDetail() {
  const { id } = useParams()
  const [movie, setMovie] = useState(null)
  const [showtimes, setShowtimes] = useState([])
  const [status, setStatus] = useState('loading') // loading | ok | notfound | error
  const [day, setDay] = useState(null)
  const [rating, setRating] = useState(null) // { average, count }, cập nhật khi khách thêm/sửa/xóa đánh giá

  useEffect(() => {
    let cancelled = false
    Promise.all([api.get(`/movies/${id}`), api.get('/showtimes', { params: { movie: id } })])
      .then(([m, s]) => {
        if (cancelled) return
        setMovie(m.data)
        setRating({ average: m.data.ratingAvg ?? 0, count: m.data.ratingCount ?? 0 })
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
    <>
      <TrailerHero key={movie._id} movie={movie} />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/" className="text-sm text-gray-500 hover:text-brand">← Danh sách phim</Link>

        <div className="mt-4">
          <MovieInfo
            key={movie._id}
            movie={movie}
            rating={rating}
            canBook={showtimes.length > 0}
            onBook={() => document.getElementById('showtimes')?.scrollIntoView({ behavior: 'smooth' })}
          />
        </div>

        {movie.description && (
          <section className="mt-10">
            <h2 className="mb-3 text-2xl font-bold text-[#231f20]">Tóm tắt</h2>
            <p className="whitespace-pre-line break-words leading-relaxed text-gray-600">{movie.description}</p>
          </section>
        )}

        <section id="showtimes" className="mt-12 scroll-mt-4">
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
                    <h3 className="font-bold">
                      <Link to={`/cinemas/${cinema._id}?date=${selected}`} className="hover:text-brand hover:underline">{cinema.name}</Link>
                    </h3>
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

        <section id="reviews" className="mt-12 scroll-mt-20">
          <h2 className="mb-4 border-l-4 border-brand pl-3 text-2xl font-bold">Đánh giá</h2>
          <MovieReviews movieId={id} onSummary={setRating} />
        </section>
      </div>
    </>
  )
}
