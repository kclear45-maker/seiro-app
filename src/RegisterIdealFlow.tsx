import { useState } from 'react'
import type { AppScreen } from './HomeScreen'
import type { AppData, Ideal, IdealColor, Waypoint } from './types'
import {
  MAX_IDEAL_NAME_LENGTH,
  MAX_WAYPOINT_NAME_LENGTH,
  MAX_WAYPOINTS_PER_IDEAL,
} from './constants'
import { loadAppData, saveAppData } from './storage'
import yellowStar from '../material/yellow_star.png'
import pinkStar from '../material/pink_star.png'
import mintStar from '../material/mint_star.png'

type DraftWaypoint = {
  name: string
  targetYearMonth: string | null
}

type RegisterIdealFlowProps = {
  onNavigate: (screen: AppScreen) => void
  showBackToHome: boolean
  onRegistered: (data: AppData) => void
}

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

/** 年月ありは直近→未来。年月なしは後ろへ */
function compareDraftWaypointsByDate(
  a: DraftWaypoint,
  b: DraftWaypoint,
): number {
  const aDate = a.targetYearMonth
  const bDate = b.targetYearMonth
  if (aDate === null && bDate === null) {
    return 0
  }
  if (aDate === null) {
    return 1
  }
  if (bDate === null) {
    return -1
  }
  return aDate.localeCompare(bDate)
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function RegisterIdealFlow({
  onNavigate,
  showBackToHome,
  onRegistered,
}: RegisterIdealFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [idealName, setIdealName] = useState('')
  const [waypoints, setWaypoints] = useState<DraftWaypoint[]>([])
  const [selectedColor, setSelectedColor] = useState<IdealColor | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [modalName, setModalName] = useState('')
  const [modalYearMonth, setModalYearMonth] = useState('')

  function openWaypointModal(index: number | null) {
    if (index === null) {
      if (waypoints.length >= MAX_WAYPOINTS_PER_IDEAL) {
        return
      }
      setEditingIndex(null)
      setModalName('')
      setModalYearMonth('')
    } else {
      const target = waypoints[index]
      setEditingIndex(index)
      setModalName(target.name)
      setModalYearMonth(target.targetYearMonth ?? '')
    }
    setIsModalOpen(true)
  }

  function closeWaypointModal() {
    setIsModalOpen(false)
    setEditingIndex(null)
    setModalName('')
    setModalYearMonth('')
  }

  function handleSaveWaypoint() {
    const name = modalName.trim().slice(0, MAX_WAYPOINT_NAME_LENGTH)
    if (name.length === 0) {
      return
    }

    const nextWaypoint: DraftWaypoint = {
      name,
      targetYearMonth: modalYearMonth === '' ? null : modalYearMonth,
    }

    if (editingIndex === null) {
      if (waypoints.length >= MAX_WAYPOINTS_PER_IDEAL) {
        return
      }
      setWaypoints(
        [...waypoints, nextWaypoint].sort(compareDraftWaypointsByDate),
      )
    } else {
      const nextWaypoints = [...waypoints]
      nextWaypoints[editingIndex] = nextWaypoint
      setWaypoints(nextWaypoints.sort(compareDraftWaypointsByDate))
    }

    closeWaypointModal()
  }

  function handleStep1Next() {
    const name = idealName.trim().slice(0, MAX_IDEAL_NAME_LENGTH)
    if (name.length === 0) {
      return
    }
    setIdealName(name)
    setStep(2)
  }

  function handleStep2Next() {
    if (waypoints.length === 0) {
      return
    }
    setStep(3)
  }

  function handleRegister() {
    if (selectedColor === null) {
      return
    }

    const currentData = loadAppData()
    const createdAt = new Date().toISOString()
    const idealId = createId()

    const ideal: Ideal = {
      id: idealId,
      name: idealName,
      color: selectedColor,
      targetYearMonth: null,
      isAchieved: false,
      achievedDate: null,
      createdAt,
    }

    const createdWaypoints: Waypoint[] = [...waypoints]
      .sort(compareDraftWaypointsByDate)
      .map((waypoint, index) => ({
        id: createId(),
        idealId,
        name: waypoint.name,
        targetYearMonth: waypoint.targetYearMonth,
        isAchieved: false,
        order: index,
        createdAt,
      }))

    const nextData: AppData = {
      ideals: [...currentData.ideals, ideal],
      waypoints: [...currentData.waypoints, ...createdWaypoints],
      plans: currentData.plans,
    }

    saveAppData(nextData)
    onRegistered(nextData)
  }

  const colorOptions: {
    color: IdealColor
    src: string
  }[] = [
    { color: 'yellow', src: yellowStar },
    { color: 'pink', src: pinkStar },
    { color: 'mint', src: mintStar },
  ]

  const waypointSlots = Array.from(
    { length: MAX_WAYPOINTS_PER_IDEAL },
    (_, index) => waypoints[index] ?? null,
  )

  return (
    <div className="register-ideal-screen">
      {step === 1 && (
        <>
          <h1 className="register-ideal-screen__title">新しい理想を登録</h1>
          <p className="register-ideal-screen__lead">
            「こうなれたらいいな」を、ひとつ登録しましょう。
          </p>

          <input
            className="register-ideal-screen__input"
            type="text"
            value={idealName}
            maxLength={MAX_IDEAL_NAME_LENGTH}
            placeholder="例：健康的な生活がしたい"
            onChange={(event) => {
              setIdealName(
                event.target.value.slice(0, MAX_IDEAL_NAME_LENGTH),
              )
            }}
          />

          <button
            type="button"
            className="register-ideal-screen__next"
            onClick={handleStep1Next}
          >
            次へ
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="register-ideal-screen__title">{idealName}</h1>
          <p className="register-ideal-screen__lead register-ideal-screen__lead--waypoint">
            <span className="register-ideal-screen__lead-main">
              理想にたどり着くまでに、どのような経由地を通りますか？
            </span>
            <span className="register-ideal-screen__lead-note">
              （五つまで登録できます）
            </span>
          </p>

          <ul className="register-waypoint-list">
            {waypointSlots.map((waypoint, index) => {
              const isEmpty = waypoint === null
              const canOpen =
                !isEmpty || waypoints.length < MAX_WAYPOINTS_PER_IDEAL

              return (
                <li key={index}>
                  <button
                    type="button"
                    className="register-waypoint-list__item"
                    disabled={!canOpen && isEmpty}
                    onClick={() => {
                      if (isEmpty) {
                        openWaypointModal(null)
                      } else {
                        openWaypointModal(index)
                      }
                    }}
                  >
                    {isEmpty ? (
                      <span className="register-waypoint-list__placeholder">
                        {index === 0
                          ? '例：運動する習慣をつける（yyyy/mm頃まで）'
                          : ''}
                      </span>
                    ) : (
                      <span className="register-waypoint-list__text">
                        {waypoint.name}
                        {waypoint.targetYearMonth
                          ? `（${formatYearMonthLabel(waypoint.targetYearMonth)}）`
                          : ''}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="register-ideal-screen__actions">
            <button
              type="button"
              className="register-ideal-screen__back"
              onClick={() => setStep(1)}
            >
              戻る
            </button>
            <button
              type="button"
              className="register-ideal-screen__next"
              onClick={handleStep2Next}
            >
              次へ
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="register-ideal-screen__title">{idealName}</h1>
          <p className="register-ideal-screen__lead">
            この理想のイメージカラーを選んでください。
          </p>

          <div className="register-color-picker" role="group" aria-label="イメージカラー">
            {colorOptions.map((option) => {
              const isSelected = selectedColor === option.color
              return (
                <button
                  key={option.color}
                  type="button"
                  className={
                    [
                      'register-color-picker__item',
                      `register-color-picker__item--${option.color}`,
                      isSelected ? 'register-color-picker__item--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                  }
                  onClick={() => setSelectedColor(option.color)}
                  aria-pressed={isSelected}
                >
                  <img src={option.src} alt="" />
                </button>
              )
            })}
          </div>

          <div className="register-ideal-screen__actions">
            <button
              type="button"
              className="register-ideal-screen__back"
              onClick={() => setStep(2)}
            >
              戻る
            </button>
            <button
              type="button"
              className="register-ideal-screen__next"
              onClick={handleRegister}
              disabled={selectedColor === null}
            >
              登録
            </button>
          </div>
        </>
      )}

      {showBackToHome && (
        <nav
          className="bottom-nav register-ideal-screen__nav"
          aria-label="サブメニュー"
        >
          <button
            type="button"
            className="bottom-nav__item"
            onClick={() => onNavigate('home')}
          >
            ホームに戻る
          </button>
        </nav>
      )}

      {isModalOpen && (
        <div className="waypoint-modal">
          <button
            type="button"
            className="waypoint-modal__backdrop"
            aria-label="閉じる"
            onClick={closeWaypointModal}
          />
          <div className="waypoint-modal__panel" role="dialog" aria-modal="true">
            <div className="waypoint-modal__header waypoint-modal__header--centered">
              <h2
                className="waypoint-modal__title waypoint-modal__title--center"
              >
                経由地を登録する
              </h2>
              <button
                type="button"
                className="waypoint-modal__close"
                aria-label="閉じる"
                onClick={closeWaypointModal}
              >
                ×
              </button>
            </div>

            <input
              className="waypoint-modal__input"
              type="text"
              value={modalName}
              maxLength={MAX_WAYPOINT_NAME_LENGTH}
              placeholder="経由地名"
              onChange={(event) => {
                setModalName(
                  event.target.value.slice(0, MAX_WAYPOINT_NAME_LENGTH),
                )
              }}
            />

            <label className="waypoint-modal__month">
              <input
                type="month"
                value={modalYearMonth}
                onChange={(event) => setModalYearMonth(event.target.value)}
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
                {modalYearMonth === ''
                  ? 'いつ頃達成したいか（任意）'
                  : formatYearMonthLabel(modalYearMonth)}
              </span>
            </label>

            <button
              type="button"
              className="waypoint-modal__save"
              onClick={handleSaveWaypoint}
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RegisterIdealFlow
