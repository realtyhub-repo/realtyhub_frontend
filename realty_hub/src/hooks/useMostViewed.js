import { getPropiedadesMasVistas } from '@/api/analiticaApi'
import { getPropiedadesPorIds, listPropiedades } from '@/api/propertyApi'
import { useAsync } from '@/hooks/useAsync'

export const MOST_VIEWED_DAYS = 30
export const MOST_VIEWED_COUNT = 5

/**
 * Las propiedades más vistas del home. Pide el ranking a Analytics y resuelve las tarjetas con
 * `GET /propiedades/por-ids` (que no cuenta como vista). Si Analytics no responde o aún no hay cinco
 * propiedades disponibles con visitas, cae al listado normal para que el home nunca quede vacío.
 * Devuelve { ranked, items, dias }; con `ranked` cada item trae `vistas`.
 */
async function load(signal) {
  try {
    const ranking = await getPropiedadesMasVistas({ dias: MOST_VIEWED_DAYS, limite: 12, signal })
    if (ranking?.length) {
      const vistas = new Map(ranking.map((r) => [r.propiedadId, r.vistas]))
      const propiedades = await getPropiedadesPorIds(
        ranking.map((r) => r.propiedadId),
        { signal },
      )
      const items = (propiedades ?? [])
        .filter((p) => p.estadoComercial === 'DISPONIBLE')
        .slice(0, MOST_VIEWED_COUNT)
        .map((p) => ({ ...p, vistas: vistas.get(p.id) ?? 0 }))
      if (items.length === MOST_VIEWED_COUNT) return { ranked: true, items, dias: MOST_VIEWED_DAYS }
    }
  } catch (err) {
    if (signal.aborted) throw err
  }

  const page = await listPropiedades({ signal, estadoComercial: 'DISPONIBLE', size: MOST_VIEWED_COUNT })
  return { ranked: false, items: page?.content ?? [], dias: MOST_VIEWED_DAYS }
}

export function useMostViewed() {
  return useAsync(load, [])
}
