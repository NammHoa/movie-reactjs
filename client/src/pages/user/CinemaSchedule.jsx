import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import api from '../../api/axios'
import { Poster } from '../../components/MovieCard'
import { dayLabel, formatPrice, formatRating, formatTime } from '../../lib/movie'

const LOW_SEATS = 5

function Showtime({ s }) {
  const base = 'block rounded border px-4 py-2 text-center'
  const info = (
    <>
      <p className="font-bold">{formatTime(s.startTime)}</p>
      <p className="text-xs text-gray-500">{s.room.name} • {formatPrice(s.price)}</p>
      <p className={`text-xs font-semibold ${s.soldOut ? 'text-red-600' : s.available <= LOW_SEATS ? 'text-amber-600' : 'text-gray-500'}`}>
        {s.soldOut ? 'Hết vé' : `Còn ${s.available} ghế`}
      </p>
    </>
  )
  if (s.soldOut) {
    return <span className={`${base} cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400`} aria-disabled="true">{info}</span>
  }
  return (
    <Link to={`/booking/${s._id}`} className={`${base} border-gray-300 transition hover:border-brand hover:text-brand`}>
      {info}
    </Link>
  )
}

export default function CinemaSchedule() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const wanted = params.get('date') ?? ''
  const [done, setDone] = useState({ key: '', data: null, status: 'loading' }) // status: loading | ok | notfound | error

  const key = `${id}|${wanted}`
  useEffect(() => {
    let cancelled = false
    api
      .get(`/cinemas/${id}/schedule`, { params: { date: wanted || undefined } })
      .then(({ data }) => !cancelled && setDone({ key, data, status: 'ok' }))
      .catch((err) => {
        if (cancelled) return
        // Địa chỉ có ngày sai (gõ tay hoặc link cũ): bỏ ngày đó, hiện ngày gần nhất
        if (err.response?.status === 400 && wanted) return setParams({}, { replace: true })
        setDone((d) => ({ ...d, key, status: err.response?.status === 404 ? 'notfound' : 'error' }))
      })
    return () => {
      cancelled = true
    }
  }, [key, id, wanted, setParams])

  const { data, status } = done
  const loading = done.key !== key

  if (!data && status === 'loading') return <p className="p-8 text-center text-gray-500">Đang tải lịch chiếu...</p>
  if (status === 'notfound')
    return (
      <div className="p-8 text-center">
        <p className="mb-3 text-gray-600">Không tìm thấy rạp này.</p>
        <Link to="/cinemas" className="font-semibold text-brand hover:underline">← Danh sách rạp</Link>
      </div>
    )
  if (status === 'error' && !data) return <p className="p-8 text-center text-red-600">Không thể tải lịch chiếu</p>

  const { cinema, dates, date, movies } = data

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/cinemas" className="text-sm text-gray-500 hover:text-brand">← Danh sách rạp</Link>
      <h1 className="mt-2 border-l-4 border-brand pl-3 text-2xl font-bold">{cinema.name}</h1>
      <p className="mt-1 pl-4 text-sm text-gray-500">{[cinema.address, cinema.city].filter(Boolean).join(', ')}</p>

      {status === 'error' && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">Không thể tải lịch chiếu của ngày này</p>}

      {dates.length === 0 ? (
        <p className="mt-6 rounded-lg bg-white p-6 text-gray-500 shadow-sm">Rạp này chưa có lịch chiếu.</p>
      ) : (
        <>
          <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
            {dates.map((d) => (
              <button
                key={d}
                onClick={() => setParams({ date: d })}
                aria-pressed={d === date}
                className={`h-10 shrink-0 whitespace-nowrap rounded px-4 text-sm font-semibold transition ${
                  d === date ? 'bg-brand text-white' : 'bg-white text-gray-700 shadow-sm hover:text-brand'
                }`}
              >
                {dayLabel(d)}
              </button>
            ))}
          </div>

          <div className={`mt-4 space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            {movies.length === 0 && (
              <p className="rounded-lg bg-white p-6 text-gray-500 shadow-sm">Không có suất chiếu nào trong ngày này.</p>
            )}
            {movies.map(({ movie, showtimes }) => (
              <article key={movie._id} className="flex gap-4 rounded-lg bg-white p-4 shadow-sm">
                <Link to={`/movies/${movie._id}`} className="shrink-0">
                  <Poster src={movie.poster} alt="" className="h-28 w-20 rounded sm:h-36 sm:w-24" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/movies/${movie._id}`} className="break-words text-lg font-bold leading-tight hover:text-brand">
                    {movie.title}
                  </Link>
                  <p className="mt-1 text-xs text-gray-500">
                    {movie.duration} phút{movie.genres?.length ? ` • ${movie.genres.join(', ')}` : ''}
                    {movie.ratingCount > 0 && <span> • <span className="text-amber-500">★</span> {formatRating(movie.ratingAvg)} ({movie.ratingCount})</span>}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {showtimes.map((s) => (
                      <Showtime key={s._id} s={s} />
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
