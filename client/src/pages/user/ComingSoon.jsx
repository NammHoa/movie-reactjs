import { Link } from 'react-router-dom'

const btn = 'flex h-11 items-center justify-center rounded px-6 text-sm font-bold uppercase transition'

export default function ComingSoon({ title }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="break-words text-2xl font-extrabold uppercase text-[#231f20] sm:text-3xl">{title}</h1>
      <div className="mx-auto mt-4 h-1 w-16 bg-[#ddd3b5]" />
      <p className="mt-6 text-gray-600">Tính năng đang được phát triển.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link to="/#movie-list" className={`${btn} bg-brand text-white hover:bg-brand-dark`}>Mua vé</Link>
        <Link to="/" className={`${btn} border border-gray-300 bg-white text-gray-700 hover:bg-gray-100`}>Về trang chủ</Link>
      </div>
    </main>
  )
}
