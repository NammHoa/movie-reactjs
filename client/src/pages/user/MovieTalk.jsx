import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../../api/axios'
import MovieCard from '../../components/MovieCard'
import { TALK_TABS, statusFromSearch } from '../../lib/movieTalk'

// Mỗi tab dựng một lưới mới (xem key ở dưới) nên danh sách của tab trước không bao giờ hiện dưới tab đang chọn
function MovieGrid({ status }) {
  const [result, setResult] = useState({ movies: null, failed: false })

  useEffect(() => {
    let cancelled = false
    api
      .get('/movies', { params: { status } })
      .then(({ data }) => !cancelled && setResult({ movies: data, failed: false }))
      .catch(() => !cancelled && setResult({ movies: null, failed: true }))
    return () => {
      cancelled = true
    }
  }, [status])

  if (result.failed) return <p className="text-center text-red-600">Không thể tải danh sách phim</p>
  if (!result.movies) return <p className="text-center text-gray-500">Đang tải...</p>
  if (result.movies.length === 0) return <p className="text-center text-gray-500">Chưa có phim nào trong mục này.</p>

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {result.movies.map((m) => (
        <MovieCard key={m._id} movie={m} />
      ))}
    </div>
  )
}

export default function MovieTalk() {
  const { search } = useLocation()
  const status = statusFromSearch(search)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 border-l-4 border-brand pl-3 text-2xl font-bold">Movie Talk</h1>

      <nav aria-label="Nhóm phim" className="mb-6 flex justify-center gap-8 border-b border-gray-200">
        {TALK_TABS.map((t) => (
          // replace: đổi tab không thêm mục vào lịch sử, nên "Quay lại" không phải đi qua từng tab
          <Link
            key={t.status}
            to={{ pathname: '/movie-talk', search: t.search }}
            replace
            aria-current={t.status === status ? 'page' : undefined}
            className={`-mb-px border-b-2 px-1 pb-3 text-lg font-bold transition ${
              t.status === status ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <MovieGrid key={status} status={status} />
    </main>
  )
}
