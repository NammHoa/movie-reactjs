import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../../api/axios'
import BannerSlider from '../../components/BannerSlider'
import BoxOffice from '../../components/BoxOffice'
import PosterRow from '../../components/PosterRow'

export default function Home() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [top, setTop] = useState(null) // null: banner và Box Office chưa tải xong
  const [scrollRequest, setScrollRequest] = useState(0)
  const handledScroll = useRef(0)
  const listRef = useRef(null)
  const location = useLocation()

  // Chờ cả hai rồi mới vẽ để bảng xếp hạng không nhảy chỗ. Đây là phần phụ: cái nào lỗi thì ẩn cái đó
  useEffect(() => {
    let cancelled = false
    const dataOf = (res) => (res.status === 'fulfilled' ? res.value.data : [])
    Promise.allSettled([api.get('/banners'), api.get('/movies/box-office')]).then(([banners, ranking]) => {
      if (!cancelled) setTop({ banners: dataOf(banners), ranking: dataOf(ranking) })
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    api
      .get('/movies', { params: { status: 'now_showing' } })
      .then(({ data }) => !cancelled && setMovies(data))
      .catch(() => !cancelled && setError('Không thể tải danh sách phim'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  // "Mua vé" trên menu và "Mua vé ngay" ở Box Office cùng đi qua đây
  const showNowPlaying = () => setScrollRequest((n) => n + 1)

  // Menu "Mua vé" trỏ tới /#movie-list; bấm lại khi đang ở trang chủ vẫn đổi location.key.
  // Cập nhật ngay trong lúc render (cách React khuyên dùng) thay vì setState trong effect
  const [seenLocation, setSeenLocation] = useState(null)
  if (seenLocation !== location.key) {
    setSeenLocation(location.key)
    if (location.hash === '#movie-list') showNowPlaying()
  }

  // Phần nào chưa tải xong thì trang còn thiếu chiều cao, cuộn sẽ dừng sai chỗ: đợi đủ rồi mới cuộn
  const ready = !loading && top !== null
  useEffect(() => {
    if (!ready || handledScroll.current === scrollRequest) return
    handledScroll.current = scrollRequest
    listRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ready, scrollRequest])

  const hasBanner = top?.banners.length > 0
  const hasRanking = top?.ranking.length > 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {(hasBanner || hasRanking) && (
        <div className={`mb-8 grid grid-cols-1 items-start gap-6 ${hasBanner && hasRanking ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
          {hasBanner && (
            <div className="min-w-0">
              <BannerSlider items={top.banners} />
            </div>
          )}
          {hasRanking && (
            <div className={`min-w-0 ${hasBanner ? '' : 'mx-auto w-full max-w-md'}`}>
              <BoxOffice items={top.ranking} onBuy={showNowPlaying} />
            </div>
          )}
        </div>
      )}

      <section id="movie-list" ref={listRef} aria-labelledby="now-showing-title" className="scroll-mt-4">
        <h2 id="now-showing-title" className="sr-only">Phim đang chiếu</h2>
        {loading && <p className="text-center text-gray-500">Đang tải...</p>}
        {error && <p className="text-center text-red-600">{error}</p>}
        {!loading && !error && movies.length === 0 && <p className="text-center text-gray-500">Chưa có phim đang chiếu.</p>}
        <PosterRow movies={movies} />
      </section>
    </div>
  )
}
