'use client'
import { useEffect, useState } from 'react'
import type { TrailRoute } from '@/lib/trail-route'

/**
 * A trail's route and elevation profile from public/routes/<id>.json, written by
 * scripts/build-trail-routes.mjs. Pass null when the trail has no file, so nothing is fetched.
 * Without the file the map still shows the route from the map tiles, from zoom 9.
 */
export function useTrailRoute(id: string | null): TrailRoute | null {
  const [loaded, setLoaded] = useState<{ id: string; route: TrailRoute } | null>(null)
  useEffect(() => {
    if (!id) return
    let live = true
    fetch(`/routes/${id}.json`)
      .then((res) => (res.ok ? (res.json() as Promise<TrailRoute>) : null))
      .then((route) => live && route && setLoaded({ id, route }))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [id])
  // A route loaded for an earlier selection is not this trail's.
  return id && loaded?.id === id ? loaded.route : null
}
