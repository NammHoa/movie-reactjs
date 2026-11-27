import { useState } from 'react'

// Trình phát đặt trong một khung 16:9; source lấy từ trailerSource()
export default function TrailerPlayer({ source, url, title }) {
  const [failed, setFailed] = useState(false)

  if (source.type === 'youtube') {
    return (
      <iframe
        src={source.src}
        title={`Trailer ${title}`}
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        className="h-full w-full border-0"
      />
    )
  }

  // Link hỏng, máy chủ chặn hoặc trình duyệt không đọc được định dạng: vẫn còn đường mở trực tiếp
  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-sm text-gray-200">
        <p>Không phát được video này.</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
          Mở trong tab mới
        </a>
      </div>
    )
  }

  return (
    <video
      src={source.src}
      title={`Trailer ${title}`}
      controls
      autoPlay
      playsInline
      onError={() => setFailed(true)}
      className="h-full w-full bg-black"
    />
  )
}
