import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'

const NO_CITY = 'Khác'

export default function Cinemas() {
  const [cinemas, setCinemas] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get('/cinemas', { params: { withUpcoming: 1 } })
      .then(({ data }) => !cancelled && setCinemas(data))
      .catch(() => !cancelled && setError('Không thể tải danh sách rạp'))
    return () => {
      cancelled = true
    }
  }, [])

  const groups = {}
  for (const c of cinemas ?? []) (groups[c.city || NO_CITY] ??= []).push(c)
  const cities = Object.keys(groups).sort((a, b) => (a === NO_CITY) - (b === NO_CITY) || a.localeCompare(b, 'vi'))

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 border-l-4 border-brand pl-3 text-2xl font-bold">Rạp chiếu</h1>

      {error && <p className="text-red-600">{error}</p>}
      {!cinemas && !error && <p className="text-gray-500">Đang tải...</p>}
      {cinemas && cinemas.length === 0 && <p className="rounded-lg bg-white p-6 text-gray-500 shadow-sm">Chưa có rạp nào.</p>}

      <div className="space-y-8">
        {cities.map((city) => (
          <section key={city}>
            <h2 className="mb-3 text-lg font-bold text-gray-700">{city}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups[city].map((c) => (
                <li key={c._id} className="min-w-0">
                  <Link to={`/cinemas/${c._id}`} className="block h-full rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md">
                    <h3 className="break-words font-bold">{c.name}</h3>
                    {c.address && <p className="mt-1 break-words text-sm text-gray-500">{c.address}</p>}
                    <p className={`mt-3 text-sm font-semibold ${c.upcomingShowtimes ? 'text-brand' : 'text-gray-400'}`}>
                      {c.upcomingShowtimes ? `${c.upcomingShowtimes} suất chiếu sắp tới →` : 'Chưa có lịch chiếu'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
