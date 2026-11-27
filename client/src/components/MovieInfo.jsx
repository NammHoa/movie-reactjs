import { useState } from 'react'
import { AGE_INFO } from '../lib/ageRating'
import { basicInfo, formatDate, formatRating } from '../lib/movie'
import { trailerSource } from '../lib/video'
import AgeBadge from './AgeBadge'
import { Poster } from './MovieCard'
import { Stars } from './Stars'
import TrailerPlayer from './TrailerPlayer'

function CopyLink() {
  const [result, setResult] = useState('') // '' | 'ok' | 'fail'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setResult('ok')
    } catch {
      setResult('fail')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button type="button" onClick={copy} className="h-9 rounded border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100">
        Sao chép link
      </button>
      {result && (
        <span role="status" className={`text-sm ${result === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
          {result === 'ok' ? 'Đã sao chép' : 'Không sao chép được, hãy chép từ thanh địa chỉ'}
        </span>
      )}
    </div>
  )
}

const trailerBtn =
  'inline-block cursor-pointer rounded border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white'

// Nút "Xem trailer" cho phim không có ảnh ngang (phim có ảnh ngang thì phát ngay ở đầu trang)
function Trailer({ url, title }) {
  const [playing, setPlaying] = useState(false)
  const source = trailerSource(url)

  if (!source) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={`mt-4 ${trailerBtn}`}>
        ▶ Xem trailer
      </a>
    )
  }

  if (!playing) {
    return (
      <button type="button" onClick={() => setPlaying(true)} className={`mt-4 ${trailerBtn}`}>
        ▶ Xem trailer
      </button>
    )
  }

  return (
    <div className="mt-4 aspect-video w-full max-w-2xl overflow-hidden rounded bg-black">
      <TrailerPlayer source={source} url={url} title={title} />
    </div>
  )
}

export default function MovieInfo({ movie, rating, canBook, onBook }) {
  const age = AGE_INFO[movie.ageRating]
  const rows = [
    age && ['Xếp hạng', <span key="age" className="inline-flex flex-wrap items-center gap-2"><AgeBadge code={movie.ageRating} />{age.label}</span>],
    movie.releaseDate && ['Ngày phát hành', formatDate(movie.releaseDate)],
    basicInfo(movie) && ['Thông tin cơ bản', basicInfo(movie)],
    movie.formats?.length > 0 && ['Loại', movie.formats.join(' | ')],
  ].filter(Boolean)

  return (
    // Điện thoại: poster nhỏ cạnh tên phim, phần còn lại trải hết chiều ngang. Máy tính: cột trái là poster và nút đặt vé.
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:grid-rows-[auto_1fr_auto] md:gap-x-8">
      <Poster src={movie.poster} alt={movie.title} className="col-start-1 row-start-1 aspect-[2/3] w-full rounded shadow md:row-span-2" />

      <header className="col-start-2 row-start-1 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="break-words text-2xl font-extrabold uppercase leading-tight text-[#231f20] md:text-3xl">{movie.title}</h1>
          <div className="shrink-0">
            <CopyLink />
          </div>
        </div>
        {rating.count > 0 ? (
          <a href="#reviews" className="mt-3 inline-flex flex-wrap items-center gap-2 text-sm hover:text-brand">
            <Stars value={rating.average} className="text-xl" />
            <span className="text-lg font-bold">{formatRating(rating.average)}</span>
            <span className="text-gray-500">({rating.count} đánh giá)</span>
          </a>
        ) : (
          <p className="mt-3 text-sm text-gray-500">Chưa có đánh giá</p>
        )}
      </header>

      <div className="col-span-2 min-w-0 md:col-span-1 md:col-start-2 md:row-start-2">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-bold text-gray-900">{label}</dt>
              <dd className="break-words text-gray-600">{value}</dd>
            </div>
          ))}
        </dl>
        {!movie.backdrop && movie.trailer && <Trailer url={movie.trailer} title={movie.title} />}
      </div>

      <button
        type="button"
        onClick={onBook}
        disabled={!canBook}
        className="col-span-2 h-12 w-full rounded bg-[#231f20] font-bold text-[#e3d9a5] transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 md:col-span-1 md:col-start-1 md:row-start-3"
      >
        {canBook ? 'Đặt vé' : 'Chưa có suất chiếu'}
      </button>
    </div>
  )
}
