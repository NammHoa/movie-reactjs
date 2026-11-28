import { useState } from 'react'

export function Poster({ src, alt, className = '' }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 text-3xl text-gray-400 ${className}`}>
        🎬
      </div>
    )
  }
  return <img src={src} alt={alt} onError={() => setBroken(true)} className={`object-cover ${className}`} />
}
