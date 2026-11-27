import { useState } from 'react'
import { Link } from 'react-router-dom'

// Trong suốt thì phải không bấm được, nếu không lần chạm đầu trên điện thoại sẽ trúng nút đang ẩn.
// group-hover của Tailwind chỉ chạy trên thiết bị có rê chuột nên không ảnh hưởng màn hình cảm ứng
const hiddenCls =
  'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100'
const shownCls = 'pointer-events-auto opacity-100'

const actionCls =
  'flex min-h-12 w-full max-w-44 items-center justify-center border border-[#c9bd8a] px-2 text-base font-bold text-[#e3d9a5] transition hover:bg-[#e3d9a5] hover:text-[#231f20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3d9a5]'

// Thẻ chỉ có poster: rê chuột, chạm hoặc dùng phím Tab thì hiện hai nút
export default function PosterTile({ movie, active, onActivate, onDeactivate }) {
  const [broken, setBroken] = useState(false)

  return (
    <div data-tile={movie._id} onClick={onActivate} onMouseLeave={onDeactivate} className="group relative aspect-[2/3] overflow-hidden bg-gray-200">
      {movie.poster && !broken ? (
        <img src={movie.poster} alt={movie.title} onError={() => setBroken(true)} className="h-full w-full object-cover" />
      ) : (
        // Không còn chữ nào quanh poster, nên thiếu ảnh thì phải hiện tên phim
        <div className="flex h-full items-center justify-center px-3 text-center font-bold text-gray-700">
          <span className="line-clamp-5 min-w-0 break-words">{movie.title}</span>
        </div>
      )}

      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 px-3 transition-opacity ${active ? shownCls : hiddenCls}`}>
        <Link to={`/movies/${movie._id}#showtimes`} aria-label={`Đặt vé phim ${movie.title}`} className={actionCls}>
          Đặt vé
        </Link>
        <Link to={`/movies/${movie._id}`} aria-label={`Chi tiết phim ${movie.title}`} className={actionCls}>
          Chi tiết
        </Link>
      </div>
    </div>
  )
}
