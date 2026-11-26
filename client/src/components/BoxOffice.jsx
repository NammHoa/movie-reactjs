import { Link } from 'react-router-dom'
import { rankMeta } from '../lib/movie'
import AgeBadge from './AgeBadge'

export default function BoxOffice({ items, onBuy }) {
  if (!items.length) return null

  return (
    <section aria-labelledby="box-office-title" className="overflow-hidden rounded-lg bg-white shadow-sm">
      <h2 id="box-office-title" className="bg-[#231f20] px-4 py-3 text-center text-lg font-extrabold tracking-widest text-[#e3d9a5]">
        BOX OFFICE
      </h2>
      <ol className="divide-y divide-gray-100">
        {items.map((m, i) => (
          <li key={m._id}>
            <Link to={`/movies/${m._id}`} className="group flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
              <span className={`w-6 shrink-0 text-center text-lg font-extrabold ${i < 3 ? 'text-brand' : 'text-gray-400'}`}>{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <AgeBadge code={m.ageRating} />
                  <span title={m.title} className="truncate text-sm font-semibold group-hover:text-brand">{m.title}</span>
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">{rankMeta(m)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <div className="border-t border-gray-100 p-3">
        <button type="button" onClick={onBuy} className="h-11 w-full rounded bg-brand text-sm font-bold uppercase text-white hover:bg-brand-dark">
          Mua vé ngay
        </button>
      </div>
    </section>
  )
}
