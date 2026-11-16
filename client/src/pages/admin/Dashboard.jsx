import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { STATUS_LABELS } from '../../lib/movie'

export default function Dashboard() {
  const [movies, setMovies] = useState(null)

  useEffect(() => {
    api.get('/movies').then(({ data }) => setMovies(data)).catch(() => setMovies([]))
  }, [])

  const count = (status) => movies?.filter((m) => m.status === status).length ?? '…'

  return (
    <div>
      <h1 className="mb-6 border-l-4 border-brand pl-3 text-2xl font-bold">Tổng quan</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Tổng số phim', movies?.length ?? '…'],
          [STATUS_LABELS.now_showing, count('now_showing')],
          [STATUS_LABELS.coming_soon, count('coming_soon')],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 text-3xl font-bold text-brand">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
