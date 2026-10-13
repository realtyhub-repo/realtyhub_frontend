import { useCallback, useEffect, useState } from 'react'

/**
 * Ejecuta `fn(signal)` al montar y cada vez que cambian `deps`. Cancela la petición anterior.
 * Devuelve { data, error, loading, reload, setData }. `setData` permite aplicar cambios locales
 * tras una mutación sin volver a pedir todo.
 */
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    setState((s) => ({ ...s, error: null, loading: true }))
    fn(ctrl.signal).then(
      (data) => !ctrl.signal.aborted && setState({ data, error: null, loading: false }),
      (error) => !ctrl.signal.aborted && setState({ data: null, error, loading: false }),
    )
    return () => ctrl.abort()
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- deps los define quien llama
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const setData = useCallback(
    (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
    [],
  )

  return { ...state, reload, setData }
}
