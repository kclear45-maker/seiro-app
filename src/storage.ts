import type { AppData } from './types'

const STORAGE_KEY = 'seiro-app-data'

export function getInitialAppData(): AppData {
  return {
    ideals: [],
    waypoints: [],
    plans: [],
  }
}

function isAppData(value: unknown): value is AppData {
  if (value === null || typeof value !== 'object') {
    return false
  }

  const data = value as Record<string, unknown>
  return (
    Array.isArray(data.ideals) &&
    Array.isArray(data.waypoints) &&
    Array.isArray(data.plans)
  )
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return getInitialAppData()
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isAppData(parsed)) {
      return getInitialAppData()
    }

    return parsed
  } catch {
    return getInitialAppData()
  }
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
