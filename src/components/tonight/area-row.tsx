'use client'

import { useState } from 'react'
import { AREAS, HOT_AREAS } from '@/tonight/places'

export function AreaRow({
  nearOn,
  allOn,
  area,
  onNear,
  onAll,
  onArea,
}: {
  nearOn: boolean
  allOn: boolean
  area: string
  onNear: () => void
  onAll: () => void
  onArea: (name: string) => void
}) {
  const [more, setMore] = useState(false)
  const hot = AREAS.filter((item) => (HOT_AREAS as readonly string[]).includes(item.name))
  const rest = AREAS.filter((item) => !(HOT_AREAS as readonly string[]).includes(item.name))
  const extra = rest.find((item) => item.name === area)

  return (
    <>
      <div className="areas" aria-label="地區">
        <button type="button" className={nearOn ? 'area on near' : 'area near'} onClick={onNear}>
          📍 我附近
        </button>
        <button type="button" className={allOn ? 'area on' : 'area'} onClick={onAll}>
          全港
        </button>
        {hot.map((item) => (
          <button key={item.id} type="button" className={area === item.name ? 'area on' : 'area'} onClick={() => onArea(item.name)}>
            {item.name}
          </button>
        ))}
        <button type="button" className={more || extra ? 'area on' : 'area'} onClick={() => setMore((value) => !value)}>
          {extra ? extra.name : '更多地區'}
        </button>
      </div>
      {more ? (
        <div className="areas" aria-label="其他地區">
          {rest.map((item) => (
            <button key={item.id} type="button" className={area === item.name ? 'area on' : 'area'} onClick={() => onArea(item.name)}>
              {item.name}
            </button>
          ))}
        </div>
      ) : null}
    </>
  )
}
