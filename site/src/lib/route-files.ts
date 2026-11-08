import { readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Ids of the trails with a route file in public/routes/, read at build time, so a page only
 * fetches files that exist. Server only.
 */
export function routeIds(): string[] {
  try {
    return readdirSync(join(process.cwd(), 'public/routes'))
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.slice(0, -'.json'.length))
  } catch {
    return []
  }
}
