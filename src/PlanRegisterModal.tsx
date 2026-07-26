import { useState } from 'react'
import footprints from '../material/footprints.svg'
import { MAX_PLAN_TITLE_LENGTH } from './constants'
import { loadAppData, saveAppData } from './storage'
import type { AppData, Ideal, IdealColor, Plan } from './types'

export type PlanModalMode = 'create' | 'edit'

type PlanRegisterModalProps = {
  mode: PlanModalMode
  ideals: Ideal[]
  plan?: Plan
  onClose: () => void
  onSaved: (data: AppData) => void
}

const DELETE_PLAN_MESSAGE = 'この予定を削除しますか？'

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getTodayDateString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function PlanRegisterModal({
  mode,
  ideals,
  plan,
  onClose,
  onSaved,
}: PlanRegisterModalProps) {
  const today = getTodayDateString()
  const isEdit = mode === 'edit' && plan !== undefined

  const [date, setDate] = useState(isEdit ? plan.date : '')
  const [title, setTitle] = useState(isEdit ? plan.title : '')
  const [selectedIdealId, setSelectedIdealId] = useState<string | null>(
    isEdit ? plan.idealId : null,
  )
  const [status, setStatus] = useState<'active' | 'completed'>(
    isEdit ? plan.status : 'active',
  )
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isCompletedOpen, setIsCompletedOpen] = useState(false)
  const [completedIdealColor, setCompletedIdealColor] =
    useState<IdealColor>('yellow')

  const canSave =
    date !== '' &&
    (isEdit || date >= today) &&
    title.trim().length > 0 &&
    selectedIdealId !== null

  function getFormValues(): {
    title: string
    date: string
    idealId: string
  } | null {
    if (date === '' || title.trim().length === 0 || selectedIdealId === null) {
      return null
    }
    if (!isEdit && date < today) {
      return null
    }
    return {
      title: title.trim().slice(0, MAX_PLAN_TITLE_LENGTH),
      date,
      idealId: selectedIdealId,
    }
  }

  function handleSave() {
    const values = getFormValues()
    if (values === null) {
      return
    }

    const currentData = loadAppData()

    if (isEdit) {
      const nextData: AppData = {
        ...currentData,
        plans: currentData.plans.map((item) =>
          item.id === plan.id
            ? {
                ...item,
                title: values.title,
                date: values.date,
                idealId: values.idealId,
                status,
              }
            : item,
        ),
      }
      saveAppData(nextData)
      onSaved(nextData)
      onClose()
      return
    }

    const nextPlan: Plan = {
      id: createId(),
      idealId: values.idealId,
      title: values.title,
      date: values.date,
      status: 'active',
      createdAt: new Date().toISOString(),
    }

    const nextData: AppData = {
      ...currentData,
      plans: [...currentData.plans, nextPlan],
    }

    saveAppData(nextData)
    onSaved(nextData)
    onClose()
  }

  function handleComplete() {
    if (!isEdit) {
      return
    }

    const values = getFormValues()
    if (values === null) {
      return
    }

    const currentData = loadAppData()
    const nextData: AppData = {
      ...currentData,
      plans: currentData.plans.map((item) =>
        item.id === plan.id
          ? {
              ...item,
              title: values.title,
              date: values.date,
              idealId: values.idealId,
              status: 'completed',
            }
          : item,
      ),
    }

    saveAppData(nextData)
    setStatus('completed')
    const ideal = ideals.find((item) => item.id === values.idealId)
    setCompletedIdealColor(ideal?.color ?? 'yellow')
    onSaved(nextData)
    setIsCompletedOpen(true)
  }

  function handleUncomplete() {
    if (!isEdit) {
      return
    }

    const values = getFormValues()
    if (values === null) {
      return
    }

    const currentData = loadAppData()
    const nextData: AppData = {
      ...currentData,
      plans: currentData.plans.map((item) =>
        item.id === plan.id
          ? {
              ...item,
              title: values.title,
              date: values.date,
              idealId: values.idealId,
              status: 'active',
            }
          : item,
      ),
    }

    saveAppData(nextData)
    setStatus('active')
    onSaved(nextData)
  }

  function handleDelete() {
    if (!isEdit) {
      return
    }

    const currentData = loadAppData()
    const nextData: AppData = {
      ...currentData,
      plans: currentData.plans.filter((item) => item.id !== plan.id),
    }

    saveAppData(nextData)
    onSaved(nextData)
    onClose()
  }

  if (isCompletedOpen) {
    return (
      <div className="waypoint-modal waypoint-modal--front">
        <button
          type="button"
          className="waypoint-modal__backdrop"
          aria-label="閉じる"
          onClick={onClose}
        />
        <div
          className="waypoint-modal__panel waypoint-achieved-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-completed-message"
        >
          <span
            className={`plan-completed-panel__star plan-completed-panel__star--${completedIdealColor}`}
            aria-hidden="true"
          />
          <p
            id="plan-completed-message"
            className="plan-completed-panel__message"
          >
            完了しました！
          </p>
          <button
            type="button"
            className="waypoint-modal__save"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="waypoint-modal waypoint-modal--front">
      <button
        type="button"
        className="waypoint-modal__backdrop"
        aria-label="閉じる"
        onClick={onClose}
      />
      <div
        className="waypoint-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-register-title"
      >
        <div className="waypoint-modal__header waypoint-modal__header--centered">
          <h2
            id="plan-register-title"
            className="waypoint-modal__title waypoint-modal__title--center"
          >
            {isEdit ? '予定を編集する' : '新しい予定を登録する'}
          </h2>
          <button
            type="button"
            className="waypoint-modal__close"
            aria-label="閉じる"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <input
          className="waypoint-modal__input"
          type="text"
          value={title}
          maxLength={MAX_PLAN_TITLE_LENGTH}
          placeholder="予定の内容"
          onChange={(event) => {
            setTitle(event.target.value.slice(0, MAX_PLAN_TITLE_LENGTH))
          }}
        />

        <label className="plan-date-button">
          <input
            type="date"
            value={date}
            min={isEdit ? undefined : today}
            onChange={(event) => {
              const nextDate = event.target.value
              if (!isEdit && nextDate !== '' && nextDate < today) {
                return
              }
              setDate(nextDate)
            }}
            onClick={(event) => {
              const input = event.currentTarget
              try {
                input.showPicker()
              } catch {
                // showPicker 非対応ブラウザでは通常のフォーカス動作に任せる
              }
            }}
          />
          <span className="plan-date-button__content" aria-hidden="true">
            <svg
              className="plan-date-button__icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3.5"
                y="5.5"
                width="17"
                height="15"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M3.5 10h17"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M8 3.5v4M16 3.5v4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="plan-date-button__label">
              {date === '' ? '予定日を選択' : date.replace(/-/g, '/')}
            </span>
          </span>
        </label>

        <p className="plan-ideal-select__lead">関連する理想を選択</p>

        <div
          className="plan-ideal-select"
          role="group"
          aria-label="関連する理想を選択"
        >
          {ideals.map((ideal) => {
            const isSelected = selectedIdealId === ideal.id
            return (
              <button
                key={ideal.id}
                type="button"
                className={
                  isSelected
                    ? 'plan-ideal-select__item plan-ideal-select__item--selected'
                    : 'plan-ideal-select__item'
                }
                onClick={() => setSelectedIdealId(ideal.id)}
                aria-pressed={isSelected}
              >
                <span
                  className={`plans-item__icon plans-item__icon--${ideal.color}`}
                  aria-hidden="true"
                />
                <span className="plan-ideal-select__name">{ideal.name}</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          className="waypoint-modal__save"
          onClick={handleSave}
          disabled={!canSave}
        >
          {isEdit ? '保存' : '登録'}
        </button>

        {isEdit && (
          <>
            {status === 'active' ? (
              <button
                type="button"
                className="plan-edit-action"
                onClick={handleComplete}
                disabled={!canSave}
              >
                <img
                  className="plan-edit-action__icon"
                  src={footprints}
                  alt=""
                />
                この予定を完了する
              </button>
            ) : (
              <button
                type="button"
                className="plan-edit-action"
                onClick={handleUncomplete}
              >
                未完了に戻す
              </button>
            )}

            <button
              type="button"
              className="plan-edit-delete"
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              この予定を削除する
            </button>
          </>
        )}
      </div>

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
            aria-labelledby="delete-plan-message"
          >
            <p id="delete-plan-message" className="waypoint-modal__message">
              {DELETE_PLAN_MESSAGE}
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
                onClick={handleDelete}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlanRegisterModal
