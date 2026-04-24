import { useEffect } from 'react'

const base = 'RMS'

export function usePageTitle(title) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} · ${base}` : base
    return () => {
      document.title = prev
    }
  }, [title])
}
