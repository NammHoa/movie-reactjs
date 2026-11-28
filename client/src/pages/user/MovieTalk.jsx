import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import TalkCard from '../../components/TalkCard'
import { PAGE_SIZE, TALK_TABS, orderTalkMovies, shownFromState, statusFromSearch } from '../../lib/movieTalk'

// Mỗi tab dựng một lưới mới (xem key ở dưới) nên danh sách của tab trước không bao giờ hiện dưới tab đang chọn
function MovieGrid({ status }) {
  const [result, setResult] = useState({ rows: null, failed: false })
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    // Chỉ tab đang chiếu có số thứ hạng
    const boxOffice = status === 'now_showing' ? api.get('/movies/box-office') : Promise.resolve({ data: [] })
    Promise.allSettled([api.get('/movies', { params: { status } }), boxOffice]).then(([movies, ranking]) => {
      if (cancelled) return
      if (movies.status === 'rejected') return setResult({ rows: null, failed: true })
      // Không có Box Office thì vẫn hiện đủ phim, chỉ không đánh số
      const ranked = ranking.status === 'fulfilled' ? ranking.value.data : []
      setResult({ rows: orderTalkMovies(status, movies.value.data, ranked), failed: false })
    })
    return () => {
      cancelled = true
    }
  }, [status])

  if (result.failed) return <p className="text-center text-red-600">Không thể tải danh sách phim</p>
  if (!result.rows) return <p className="text-center text-gray-500">Đang tải...</p>
  if (result.rows.length === 0) return <p className="text-center text-gray-500">Chưa có phim nào trong mục này.</p>

  const shown = shownFromState(location.state)
  const showMore = () =>
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: { shown: shown + PAGE_SIZE } })

  return (
    <>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
        {result.rows.slice(0, shown).map(({ movie, rank }) => (
          <li key={movie._id} className="min-w-0">
            <TalkCard movie={movie} rank={rank} />
          </li>
        ))}
      </ul>
      {result.rows.length > shown && (
        <button type="button" onClick={showMore} className="mt-8 h-12 w-full cursor-pointer border border-gray-300 bg-gray-100 font-bold text-gray-800 hover:bg-gray-200">
          Thêm
        </button>
      )}
    </>
  )
}

export default function MovieTalk() {
  const { search } = useLocation()
  const status = statusFromSearch(search)

  return (
    <main>
      <h1 className="sr-only">Movie Talk</h1>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav aria-label="Nhóm phim" className="mb-8 flex justify-center gap-1">
          {TALK_TABS.map((t) => (
            // replace: đổi tab không thêm mục vào lịch sử, nên "Quay lại" không phải đi qua từng tab
            <Link
              key={t.status}
              to={{ pathname: '/movie-talk', search: t.search }}
              replace
              aria-current={t.status === status ? 'page' : undefined}
              className={`flex h-14 flex-1 items-center justify-center px-2 text-center text-sm transition sm:max-w-56 sm:text-lg ${
                t.status === status ? 'bg-[#231f20] font-bold text-[#e3d9a5]' : 'bg-[#efe9da] font-semibold text-[#6b6249] hover:bg-[#e5dcc4]'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <MovieGrid key={status} status={status} />
      </div>
    </main>
  )
}
