/** 理想のイメージカラー */
export type IdealColor = 'yellow' | 'pink' | 'mint'

/** 理想（北極星）※最大3件 */
export type Ideal = {
  id: string
  name: string
  color: IdealColor
  /** 任意。例: "2026-12"（yyyy-mm）。未入力は null */
  targetYearMonth: string | null
  /** 達成済みか */
  isAchieved: boolean
  /** 達成日。例: "2026-07-18"。未達成は null */
  achievedDate: string | null
  createdAt: string
}

/** 経由地 ※理想ごとに最大5件 */
export type Waypoint = {
  id: string
  idealId: string
  name: string
  /** 任意。例: "2026-06"（yyyy-mm）。未入力は null */
  targetYearMonth: string | null
  isAchieved: boolean
  /** 表示順（小さいほど上） */
  order: number
  createdAt: string
}

/** 予定（次の一歩）※経由地には紐づけない */
export type Plan = {
  id: string
  /** どの理想に属するか */
  idealId: string
  title: string
  /** 例: "2026-07-19"（yyyy-mm-dd） */
  date: string
  status: 'active' | 'completed'
  createdAt: string
}

/** localStorage に保存する全体データ */
export type AppData = {
  ideals: Ideal[]
  waypoints: Waypoint[]
  plans: Plan[]
}
