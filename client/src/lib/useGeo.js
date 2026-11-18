import { useEffect, useState } from 'react'

const GEO_API = 'https://provinces.open-api.vn/api/v1'

// Danh sách tỉnh / quận lấy từ API công khai. provinces: null = đang tải, [] = lỗi (cho nhập tay).
// enabled = false thì chưa tải gì (vd. form chưa hiện).
export function useGeo(city, enabled = true) {
  const [provinces, setProvinces] = useState(null)
  const [districtData, setDistrictData] = useState({ city: '', list: [] })

  useEffect(() => {
    if (!enabled || provinces !== null) return
    fetch(`${GEO_API}/?depth=1`)
      .then((r) => r.json())
      .then((list) => setProvinces(list.map((p) => ({ code: p.code, name: p.name }))))
      .catch(() => setProvinces([]))
  }, [enabled, provinces])

  useEffect(() => {
    const province = provinces?.find((p) => p.name === city)
    if (!province) return
    let cancelled = false
    fetch(`${GEO_API}/p/${province.code}?depth=2`)
      .then((r) => r.json())
      .then((data) => !cancelled && setDistrictData({ city, list: data.districts.map((d) => d.name) }))
      .catch(() => !cancelled && setDistrictData({ city, list: [] }))
    return () => {
      cancelled = true
    }
  }, [city, provinces])

  return {
    provinces,
    districts: districtData.city === city ? districtData.list : [],
    geoFailed: provinces !== null && provinces.length === 0,
  }
}
