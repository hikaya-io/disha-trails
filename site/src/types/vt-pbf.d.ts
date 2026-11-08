// vt-pbf ships no types. Only the writer the tile merge uses is declared.
declare module 'vt-pbf' {
  type WritableFeature = {
    id?: number
    type: number
    properties: Record<string, unknown>
    loadGeometry(): Array<Array<{ x: number; y: number }>>
  }
  type WritableLayer = {
    name: string
    version?: number
    extent?: number
    length: number
    feature(i: number): WritableFeature
  }
  export function fromVectorTileJs(tile: { layers: Record<string, WritableLayer> }): Uint8Array
}
