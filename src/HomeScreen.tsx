import { useState } from 'react'
import yellowBrightStar from '../material/yellow_bright_star.png'
import yellowDarkStar from '../material/yellow_dark_star.png'
import yellowRoad from '../material/yellow_road.png'
import pinkBrightStar from '../material/pink_bright_star.png'
import pinkDarkStar from '../material/pink_dark_star.png'
import pinkRoad from '../material/pink_road.png'
import mintBrightStar from '../material/mint_bright_star.png'
import mintDarkStar from '../material/mint_dark_star.png'
import mintRoad from '../material/mint_road.png'
import yellowStar from '../material/yellow_star.png'
import pinkStar from '../material/pink_star.png'
import mintStar from '../material/mint_star.png'
import footprints from '../material/footprints.svg'
import miniStar from '../material/mini_star.svg'
import { MAX_IDEAL_NAME_LENGTH, MAX_WAYPOINT_NAME_LENGTH, MAX_WAYPOINTS_PER_IDEAL } from './constants'
import { loadAppData, saveAppData } from './storage'
import type { AppData, Ideal, IdealColor, Plan, Waypoint } from './types'

export type AppScreen = 'home' | 'registerIdeal' | 'recentPlans' | 'reviewPlans'

type HomeScreenProps = {
  onNavigate: (screen: AppScreen) => void
  ideals: Ideal[]
  waypoints: Waypoint[]
  plans: Plan[]
  selectedIdealId: string | null
  onSelectedIdealIdChange: (idealId: string | null) => void
  onAppDataChange: (data: AppData) => void
  onOpenPlanModal: () => void
}

const MAX_STAR_TABS = 3
const MAX_IDEALS = 3
const MAX_IDEALS_MESSAGE =
  '理想は3つまで登録できます。新しい理想を登録するには、既存の理想を削除してください。'
const DELETE_IDEAL_MESSAGE_LINE1 = 'この理想を削除しますか？'
const DELETE_IDEAL_MESSAGE_LINE2 =
  '関連する経由地と予定も削除されます。'
const DELETE_WAYPOINT_MESSAGE = 'この経由地を削除しますか？'

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const brightStarByColor: Record<IdealColor, string> = {
  yellow: yellowBrightStar,
  pink: pinkBrightStar,
  mint: mintBrightStar,
}

const darkStarByColor: Record<IdealColor, string> = {
  yellow: yellowDarkStar,
  pink: pinkDarkStar,
  mint: mintDarkStar,
}

const roadByColor: Record<IdealColor, string> = {
  yellow: yellowRoad,
  pink: pinkRoad,
  mint: mintRoad,
}

const colorOptions: { color: IdealColor; src: string }[] = [
  { color: 'yellow', src: yellowStar },
  { color: 'pink', src: pinkStar },
  { color: 'mint', src: mintStar },
]

function formatYearMonthLabel(value: string | null): string {
  if (value === null || value === '') {
    return ''
  }
  const [year, month] = value.split('-')
  if (!year || !month) {
    return ''
  }
  return `${year}年${Number(month)}月頃`
}

function formatAchievedDateLabel(value: string): string {
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) {
    return value
  }
  return `${year}年${Number(month)}月${Number(day)}日`
}

function getTodayDateString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 年月ありは直近→未来。年月なしは後ろへ */
function compareWaypointsByDate(
  a: { targetYearMonth: string | null; order?: number },
  b: { targetYearMonth: string | null; order?: number },
): number {
  const aDate = a.targetYearMonth
  const bDate = b.targetYearMonth
  if (aDate === null && bDate === null) {
    return (a.order ?? 0) - (b.order ?? 0)
  }
  if (aDate === null) {
    return 1
  }
  if (bDate === null) {
    return -1
  }
  if (aDate === bDate) {
    return (a.order ?? 0) - (b.order ?? 0)
  }
  return aDate.localeCompare(bDate)
}

function getInitialSelectedIdealId(ideals: Ideal[]): string | null {
  if (ideals.length === 0) {
    return null
  }

  const tabIdeals = ideals.slice(0, MAX_STAR_TABS)
  const latestIdeal = ideals[ideals.length - 1]
  const latestInTabs = tabIdeals.some((ideal) => ideal.id === latestIdeal.id)

  if (latestInTabs) {
    return latestIdeal.id
  }

  return tabIdeals[tabIdeals.length - 1].id
}

export { getInitialSelectedIdealId }

function HomeScreen({
  onNavigate,
  ideals,
  waypoints,
  plans,
  selectedIdealId,
  onSelectedIdealIdChange,
  onAppDataChange,
  onOpenPlanModal,
}: HomeScreenProps) {
  const tabIdeals = ideals.slice(0, MAX_STAR_TABS)

  const [isMaxIdealsModalOpen, setIsMaxIdealsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<IdealColor>('yellow')
  const [editIsAchieved, setEditIsAchieved] = useState(false)

  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null)
  const [isWaypointEditOpen, setIsWaypointEditOpen] = useState(false)
  const [isWaypointAddOpen, setIsWaypointAddOpen] = useState(false)
  const [waypointAddName, setWaypointAddName] = useState('')
  const [waypointAddYearMonth, setWaypointAddYearMonth] = useState('')
  const [isWaypointDeleteConfirmOpen, setIsWaypointDeleteConfirmOpen] =
    useState(false)
  const [isWaypointAchievedOpen, setIsWaypointAchievedOpen] = useState(false)
  const [waypointEditName, setWaypointEditName] = useState('')
  const [waypointEditYearMonth, setWaypointEditYearMonth] = useState('')
  const [waypointEditIsAchieved, setWaypointEditIsAchieved] = useState(false)
  const [achievedWaypointName, setAchievedWaypointName] = useState('')
  const [achievedWaypointColor, setAchievedWaypointColor] =
    useState<IdealColor>('yellow')

  const selectedIdeal =
    tabIdeals.find((ideal) => ideal.id === selectedIdealId) ??
    tabIdeals[tabIdeals.length - 1] ??
    null

  const selectedWaypoints =
    selectedIdeal === null
      ? []
      : waypoints
          .filter((waypoint) => waypoint.idealId === selectedIdeal.id)
          .slice()
          .sort(compareWaypointsByDate)

  const completedPlanCount =
    selectedIdeal === null
      ? 0
      : plans.filter(
          (plan) =>
            plan.idealId === selectedIdeal.id && plan.status === 'completed',
        ).length

  function closeMaxIdealsModal() {
    setIsMaxIdealsModalOpen(false)
  }

  function openEditModal() {
    if (selectedIdeal === null) {
      return
    }
    setEditName(selectedIdeal.name)
    setEditColor(selectedIdeal.color)
    setEditIsAchieved(selectedIdeal.isAchieved)
    setIsDeleteConfirmOpen(false)
    setIsEditModalOpen(true)
  }

  function closeEditModal() {
    setIsEditModalOpen(false)
    setIsDeleteConfirmOpen(false)
  }

  function handleSaveIdeal() {
    if (selectedIdeal === null) {
      return
    }

    const name = editName.trim().slice(0, MAX_IDEAL_NAME_LENGTH)
    if (name.length === 0) {
      return
    }

    const currentData = loadAppData()
    const nextAchievedDate = editIsAchieved
      ? (selectedIdeal.isAchieved && selectedIdeal.achievedDate !== null
          ? selectedIdeal.achievedDate
          : getTodayDateString())
      : null

    const nextData: AppData = {
      ...currentData,
      ideals: currentData.ideals.map((ideal) =>
        ideal.id === selectedIdeal.id
          ? {
              ...ideal,
              name,
              color: editColor,
              isAchieved: editIsAchieved,
              achievedDate: nextAchievedDate,
            }
          : ideal,
      ),
    }

    saveAppData(nextData)
    onAppDataChange(nextData)
    closeEditModal()
  }

  function handleDeleteIdeal() {
    if (selectedIdeal === null) {
      return
    }

    const currentData = loadAppData()
    const deletedId = selectedIdeal.id
    const nextData: AppData = {
      ideals: currentData.ideals.filter((ideal) => ideal.id !== deletedId),
      waypoints: currentData.waypoints.filter(
        (waypoint) => waypoint.idealId !== deletedId,
      ),
      plans: currentData.plans.filter((plan) => plan.idealId !== deletedId),
    }

    saveAppData(nextData)
    onAppDataChange(nextData)

    const nextTabs = nextData.ideals.slice(0, MAX_STAR_TABS)
    onSelectedIdealIdChange(
      nextTabs.length === 0 ? null : nextTabs[nextTabs.length - 1].id,
    )
    closeEditModal()
  }

  function openWaypointEditModal(waypoint: Waypoint) {
    setEditingWaypoint(waypoint)
    setWaypointEditName(waypoint.name)
    setWaypointEditYearMonth(waypoint.targetYearMonth ?? '')
    setWaypointEditIsAchieved(waypoint.isAchieved)
    setIsWaypointDeleteConfirmOpen(false)
    setIsWaypointAchievedOpen(false)
    setIsWaypointEditOpen(true)
  }

  function openWaypointAddModal() {
    if (selectedIdeal === null) {
      return
    }
    if (selectedWaypoints.length >= MAX_WAYPOINTS_PER_IDEAL) {
      return
    }
    setWaypointAddName('')
    setWaypointAddYearMonth('')
    setIsWaypointAddOpen(true)
  }

  function closeWaypointAddModal() {
    setIsWaypointAddOpen(false)
    setWaypointAddName('')
    setWaypointAddYearMonth('')
  }

  function handleAddWaypoint() {
    if (selectedIdeal === null) {
      return
    }
    if (selectedWaypoints.length >= MAX_WAYPOINTS_PER_IDEAL) {
      return
    }

    const name = waypointAddName.trim().slice(0, MAX_WAYPOINT_NAME_LENGTH)
    if (name.length === 0) {
      return
    }

    const currentData = loadAppData()
    const idealWaypoints = currentData.waypoints.filter(
      (waypoint) => waypoint.idealId === selectedIdeal.id,
    )
    const nextOrder =
      idealWaypoints.length === 0
        ? 0
        : Math.max(...idealWaypoints.map((waypoint) => waypoint.order)) + 1

    const nextWaypoint: Waypoint = {
      id: createId(),
      idealId: selectedIdeal.id,
      name,
      targetYearMonth:
        waypointAddYearMonth === '' ? null : waypointAddYearMonth,
      isAchieved: false,
      order: nextOrder,
      createdAt: new Date().toISOString(),
    }

    const nextData: AppData = {
      ...currentData,
      waypoints: [...currentData.waypoints, nextWaypoint],
    }

    saveAppData(nextData)
    onAppDataChange(nextData)
    closeWaypointAddModal()
  }

  function closeWaypointEditModal() {
    setIsWaypointEditOpen(false)
    setIsWaypointDeleteConfirmOpen(false)
    setEditingWaypoint(null)
  }

  function handleSaveWaypoint() {
    if (editingWaypoint === null) {
      return
    }

    const name = waypointEditName.trim().slice(0, MAX_WAYPOINT_NAME_LENGTH)
    if (name.length === 0) {
      return
    }

    const becameAchieved =
      !editingWaypoint.isAchieved && waypointEditIsAchieved

    const currentData = loadAppData()
    const nextData: AppData = {
      ...currentData,
      waypoints: currentData.waypoints.map((waypoint) =>
        waypoint.id === editingWaypoint.id
          ? {
              ...waypoint,
              name,
              targetYearMonth:
                waypointEditYearMonth === '' ? null : waypointEditYearMonth,
              isAchieved: waypointEditIsAchieved,
            }
          : waypoint,
      ),
    }

    saveAppData(nextData)
    onAppDataChange(nextData)

    if (becameAchieved) {
      setAchievedWaypointName(name)
      if (selectedIdeal !== null) {
        setAchievedWaypointColor(selectedIdeal.color)
      }
      setIsWaypointEditOpen(false)
      setIsWaypointAchievedOpen(true)
      return
    }

    closeWaypointEditModal()
  }

  function handleDeleteWaypoint() {
    if (editingWaypoint === null) {
      return
    }

    const currentData = loadAppData()
    const deletedId = editingWaypoint.id
    const nextData: AppData = {
      ...currentData,
      waypoints: currentData.waypoints.filter(
        (waypoint) => waypoint.id !== deletedId,
      ),
    }

    saveAppData(nextData)
    onAppDataChange(nextData)
    closeWaypointEditModal()
  }

  function closeWaypointAchievedModal() {
    setIsWaypointAchievedOpen(false)
    setAchievedWaypointName('')
    setEditingWaypoint(null)
  }

  return (
    <div className="home-screen">
      {ideals.length > 0 && selectedIdeal !== null ? (
        <>
          <div className="star-tabs" role="tablist" aria-label="理想">
            {tabIdeals.map((ideal) => {
              const isSelected = selectedIdeal.id === ideal.id
              return (
                <button
                  key={ideal.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className="star-tabs__button"
                  onClick={() => onSelectedIdealIdChange(ideal.id)}
                >
                  <img
                    className={
                      [
                        'star-tabs__item',
                        `star-tabs__item--${ideal.color}`,
                        isSelected ? 'star-tabs__item--selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                    }
                    src={
                      isSelected
                        ? brightStarByColor[ideal.color]
                        : darkStarByColor[ideal.color]
                    }
                    alt=""
                  />
                </button>
              )
            })}
          </div>

          <section className="road-card">
            <img
              className="road-card__image"
              src={roadByColor[selectedIdeal.color]}
              alt=""
            />
            <div className="road-card__content">
              <button
                type="button"
                className="road-card__ideal"
                onClick={openEditModal}
              >
                {selectedIdeal.name}
                <span className="road-card__chevron" aria-hidden="true">
                  &gt;
                </span>
              </button>

              <div className="waypoint-card">
                <div className="waypoint-card__header">
                  <h2 className="waypoint-card__title">経由地</h2>
                  {selectedWaypoints.length < MAX_WAYPOINTS_PER_IDEAL && (
                    <button
                      type="button"
                      className="waypoint-card__add"
                      aria-label="経由地を追加"
                      onClick={openWaypointAddModal}
                    >
                      +
                    </button>
                  )}
                </div>
                <ul
                  className={`waypoint-list waypoint-list--${selectedIdeal.color}`}
                >
                  {selectedWaypoints.map((waypoint) => (
                    <li key={waypoint.id}>
                      <button
                        type="button"
                        className="waypoint-list__item"
                        onClick={() => openWaypointEditModal(waypoint)}
                      >
                        {waypoint.isAchieved ? (
                          <span
                            className="waypoint-list__icon waypoint-list__icon--star"
                            aria-hidden="true"
                          >
                            ★
                          </span>
                        ) : (
                          <span
                            className="waypoint-list__dot"
                            aria-hidden="true"
                          />
                        )}
                        <span className="waypoint-list__text">
                          {waypoint.name}
                          {waypoint.targetYearMonth
                            ? `（${formatYearMonthLabel(waypoint.targetYearMonth)}）`
                            : ''}
                        </span>
                        <span className="road-card__chevron" aria-hidden="true">
                          &gt;
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {!selectedIdeal.isAchieved ? (
                <>
                  <button
                    type="button"
                    className={`home-action home-action--${selectedIdeal.color}`}
                    onClick={onOpenPlanModal}
                  >
                    <img className="home-action__icon" src={footprints} alt="" />
                    新しい予定を登録する
                  </button>

                  <p className="completed-plans">
                    <img className="completed-plans__icon" src={miniStar} alt="" />
                    完了した予定 {completedPlanCount}件
                  </p>
                </>
              ) : (
                <div className="road-card__achieved" aria-label="達成済み">
                  {selectedIdeal.achievedDate !== null && (
                    <p className="road-card__achieved-date">
                      {formatAchievedDateLabel(selectedIdeal.achievedDate)}
                    </p>
                  )}
                  <p className="road-card__achieved-label">
                    この理想を達成しました
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="home-screen__empty">
          <h1 className="home-screen__empty-title">
            新しい理想を登録しましょう
          </h1>
          <p className="home-screen__empty-lead">
            星路は、叶えたい理想へ向かう
            <br />
            小さな一歩を記録するアプリです。
          </p>
          <ul className="home-screen__empty-features">
            <li>
              <img
                className="home-screen__empty-star"
                src={yellowStar}
                alt=""
              />
              <span>理想を星として登録</span>
            </li>
            <li>
              <span className="home-screen__empty-dot" aria-hidden="true" />
              <span>経由地を作って道のりを描く</span>
            </li>
            <li>
              <span
                className="home-screen__empty-footprints"
                aria-hidden="true"
              />
              <span>今日の予定で一歩ずつ進む</span>
            </li>
          </ul>
          <div className="home-screen__empty-notice">
            <p className="home-screen__empty-notice-text">
              記録は端末内に保存されます。
              <br />
              機種変更やアプリ削除などで、
              <br />
              記録が消える場合があります。
            </p>
          </div>
        </div>
      )}

      <nav className="bottom-nav" aria-label="メインメニュー">
        <button
          type="button"
          className="bottom-nav__item"
          onClick={() => {
            if (ideals.length >= MAX_IDEALS) {
              setIsMaxIdealsModalOpen(true)
              return
            }
            onNavigate('registerIdeal')
          }}
        >
          理想を登録
        </button>
        <button
          type="button"
          className="bottom-nav__item"
          onClick={() => onNavigate('recentPlans')}
        >
          今後の予定
        </button>
        <button
          type="button"
          className="bottom-nav__item"
          onClick={() => onNavigate('reviewPlans')}
        >
          予定の見直し
        </button>
      </nav>

      {isMaxIdealsModalOpen && (
        <div className="waypoint-modal">
          <button
            type="button"
            className="waypoint-modal__backdrop"
            aria-label="閉じる"
            onClick={closeMaxIdealsModal}
          />
          <div
            className="waypoint-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="max-ideals-message"
          >
            <p id="max-ideals-message" className="waypoint-modal__message">
              {MAX_IDEALS_MESSAGE}
            </p>
            <button
              type="button"
              className="waypoint-modal__save"
              onClick={closeMaxIdealsModal}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedIdeal !== null && (
        <div className="waypoint-modal">
          <button
            type="button"
            className="waypoint-modal__backdrop"
            aria-label="閉じる"
            onClick={closeEditModal}
          />
          <div
            className="waypoint-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ideal-edit-title"
          >
            <div className="waypoint-modal__header waypoint-modal__header--centered">
              <h2
                id="ideal-edit-title"
                className="waypoint-modal__title waypoint-modal__title--center"
              >
                理想を編集する
              </h2>
              <button
                type="button"
                className="waypoint-modal__close"
                aria-label="閉じる"
                onClick={closeEditModal}
              >
                ×
              </button>
            </div>

            <input
              className="waypoint-modal__input"
              type="text"
              value={editName}
              maxLength={MAX_IDEAL_NAME_LENGTH}
              onChange={(event) => {
                setEditName(
                  event.target.value.slice(0, MAX_IDEAL_NAME_LENGTH),
                )
              }}
            />

            <div
              className="ideal-edit-colors"
              role="group"
              aria-label="イメージカラー"
            >
              {colorOptions.map((option) => {
                const isSelected = editColor === option.color
                return (
                  <button
                    key={option.color}
                    type="button"
                    className={
                      [
                        'ideal-edit-colors__item',
                        `ideal-edit-colors__item--${option.color}`,
                        isSelected ? 'ideal-edit-colors__item--selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                    }
                    onClick={() => setEditColor(option.color)}
                    aria-pressed={isSelected}
                  >
                    <img src={option.src} alt="" />
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="ideal-edit-achieve"
              onClick={() => setEditIsAchieved(!editIsAchieved)}
            >
              {editIsAchieved ? '未達成に戻す' : '達成する'}
            </button>

            <button
              type="button"
              className="waypoint-modal__save"
              onClick={handleSaveIdeal}
            >
              保存
            </button>

            <button
              type="button"
              className="ideal-edit-delete"
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              削除
            </button>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div className="waypoint-modal waypoint-modal--front">
          <button
            type="button"
            className="waypoint-modal__backdrop"
            aria-label="閉じる"
            onClick={() => setIsDeleteConfirmOpen(false)}
          />
          <div
            className="waypoint-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-ideal-message"
          >
            <p id="delete-ideal-message" className="waypoint-modal__message">
              {DELETE_IDEAL_MESSAGE_LINE1}
              <br />
              {DELETE_IDEAL_MESSAGE_LINE2}
            </p>
            <div className="ideal-edit-confirm-actions">
              <button
                type="button"
                className="ideal-edit-confirm-actions__cancel"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="ideal-edit-confirm-actions__delete"
                onClick={handleDeleteIdeal}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {isWaypointAddOpen && selectedIdeal !== null && (
        <div className="waypoint-modal">
          <button
            type="button"
            className="waypoint-modal__backdrop"
            aria-label="閉じる"
            onClick={closeWaypointAddModal}
          />
          <div
            className="waypoint-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="waypoint-add-title"
          >
            <div className="waypoint-modal__header waypoint-modal__header--centered">
              <h2
                id="waypoint-add-title"
                className="waypoint-modal__title waypoint-modal__title--center"
              >
                経由地を追加
              </h2>
              <button
                type="button"
                className="waypoint-modal__close"
                aria-label="閉じる"
                onClick={closeWaypointAddModal}
              >
                ×
              </button>
            </div>

            <input
              className="waypoint-modal__input"
              type="text"
              value={waypointAddName}
              maxLength={MAX_WAYPOINT_NAME_LENGTH}
              placeholder="経由地名"
              onChange={(event) => {
                setWaypointAddName(
                  event.target.value.slice(0, MAX_WAYPOINT_NAME_LENGTH),
                )
              }}
            />

            <label className="waypoint-modal__month">
              <input
                type="month"
                value={waypointAddYearMonth}
                onChange={(event) =>
                  setWaypointAddYearMonth(event.target.value)
                }
                onClick={(event) => {
                  const input = event.currentTarget
                  try {
                    input.showPicker()
                  } catch {
                    // showPicker 非対応ブラウザでは通常のフォーカス動作に任せる
                  }
                }}
              />
              <span className="waypoint-modal__month-label">
                {waypointAddYearMonth === ''
                  ? 'いつ頃達成したいか（任意）'
                  : formatYearMonthLabel(waypointAddYearMonth)}
              </span>
            </label>

            <button
              type="button"
              className="waypoint-modal__save"
              onClick={handleAddWaypoint}
            >
              保存
            </button>
          </div>
        </div>
      )}

      {isWaypointEditOpen && editingWaypoint !== null && (
        <div className="waypoint-modal">
          <button
            type="button"
            className="waypoint-modal__backdrop"
            aria-label="閉じる"
            onClick={closeWaypointEditModal}
          />
          <div
            className="waypoint-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="waypoint-edit-title"
          >
            <div className="waypoint-modal__header waypoint-modal__header--centered">
              <h2
                id="waypoint-edit-title"
                className="waypoint-modal__title waypoint-modal__title--center"
              >
                経由地を編集する
              </h2>
              <button
                type="button"
                className="waypoint-modal__close"
                aria-label="閉じる"
                onClick={closeWaypointEditModal}
              >
                ×
              </button>
            </div>

            <input
              className="waypoint-modal__input"
              type="text"
              value={waypointEditName}
              maxLength={MAX_WAYPOINT_NAME_LENGTH}
              placeholder="経由地名"
              onChange={(event) => {
                setWaypointEditName(
                  event.target.value.slice(0, MAX_WAYPOINT_NAME_LENGTH),
                )
              }}
            />

            <label className="waypoint-modal__month">
              <input
                type="month"
                value={waypointEditYearMonth}
                onChange={(event) =>
                  setWaypointEditYearMonth(event.target.value)
                }
                onClick={(event) => {
                  const input = event.currentTarget
                  try {
                    input.showPicker()
                  } catch {
                    // showPicker 非対応ブラウザでは通常のフォーカス動作に任せる
                  }
                }}
              />
              <span className="waypoint-modal__month-label">
                {waypointEditYearMonth === ''
                  ? 'いつ頃達成したいか（任意）'
                  : formatYearMonthLabel(waypointEditYearMonth)}
              </span>
            </label>

            <button
              type="button"
              className={
                [
                  'ideal-edit-achieve',
                  waypointEditIsAchieved && selectedIdeal !== null
                    ? `ideal-edit-achieve--${selectedIdeal.color}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              onClick={() =>
                setWaypointEditIsAchieved(!waypointEditIsAchieved)
              }
            >
              {editingWaypoint.isAchieved
                ? '未達成に戻す'
                : 'この経由地を達成済みにする'}
            </button>

            <button
              type="button"
              className="waypoint-modal__save"
              onClick={handleSaveWaypoint}
            >
              保存
            </button>

            <button
              type="button"
              className="ideal-edit-delete"
              onClick={() => setIsWaypointDeleteConfirmOpen(true)}
            >
              この経由地を削除する
            </button>
          </div>
        </div>
      )}

      {isWaypointDeleteConfirmOpen && (
        <div className="waypoint-modal waypoint-modal--front">
          <button
            type="button"
            className="waypoint-modal__backdrop"
            aria-label="閉じる"
            onClick={() => setIsWaypointDeleteConfirmOpen(false)}
          />
          <div
            className="waypoint-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-waypoint-message"
          >
            <p id="delete-waypoint-message" className="waypoint-modal__message">
              {DELETE_WAYPOINT_MESSAGE}
            </p>
            <div className="ideal-edit-confirm-actions">
              <button
                type="button"
                className="ideal-edit-confirm-actions__cancel"
                onClick={() => setIsWaypointDeleteConfirmOpen(false)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="ideal-edit-confirm-actions__delete"
                onClick={handleDeleteWaypoint}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {isWaypointAchievedOpen && (
        <div className="waypoint-modal waypoint-modal--front">
          <button
            type="button"
            className="waypoint-modal__backdrop"
            aria-label="閉じる"
            onClick={closeWaypointAchievedModal}
          />
          <div
            className="waypoint-modal__panel waypoint-achieved-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="waypoint-achieved-message"
          >
            <span
              className={`waypoint-achieved-panel__star waypoint-achieved-panel__star--${achievedWaypointColor}`}
              aria-hidden="true"
            >
              ★
            </span>
            <p
              id="waypoint-achieved-message"
              className="waypoint-achieved-panel__message"
            >
              <span className="waypoint-achieved-panel__name">
                {achievedWaypointName}
              </span>
              を達成しました！
            </p>
            <button
              type="button"
              className="waypoint-modal__save"
              onClick={closeWaypointAchievedModal}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomeScreen
