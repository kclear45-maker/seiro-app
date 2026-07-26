import footprints from '../material/footprints.svg'
import type { AppScreen } from './HomeScreen'
import type { IdealColor, Plan } from './types'

type ScreenProps = {
  onNavigate: (screen: AppScreen) => void
  plans: Plan[]
  ideals: { id: string; color: IdealColor }[]
  onOpenPlanModal?: () => void
  onEditPlan?: (plan: Plan) => void
}

const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'] as const

function parsePlanDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function formatPlanDateLabel(date: string): string {
  const parsed = parsePlanDate(date)
  const year = parsed.getFullYear()
  const month = parsed.getMonth() + 1
  const day = parsed.getDate()
  const weekday = weekdayLabels[parsed.getDay()]
  return `${year}/${month}/${day}(${weekday})`
}

function getTodayDateString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

type PlanGroup = {
  date: string
  items: { id: string; title: string; color: IdealColor; plan: Plan }[]
}

function buildPlanGroups(
  plans: Plan[],
  ideals: { id: string; color: IdealColor }[],
): PlanGroup[] {
  const colorByIdealId = new Map<string, IdealColor>()
  ideals.forEach((ideal) => colorByIdealId.set(ideal.id, ideal.color))

  const sorted = plans.slice().sort((a, b) => a.date.localeCompare(b.date))

  const groups: PlanGroup[] = []
  sorted.forEach((plan) => {
    const color = colorByIdealId.get(plan.idealId) ?? 'yellow'
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.date === plan.date) {
      lastGroup.items.push({ id: plan.id, title: plan.title, color, plan })
    } else {
      groups.push({
        date: plan.date,
        items: [{ id: plan.id, title: plan.title, color, plan }],
      })
    }
  })

  return groups
}

export function RecentPlansScreen({
  onNavigate,
  plans,
  ideals,
  onOpenPlanModal,
  onEditPlan,
}: ScreenProps) {
  const todayString = getTodayDateString()
  const upcomingPlans = plans.filter(
    (plan) => plan.status === 'active' && plan.date >= todayString,
  )
  const planGroups = buildPlanGroups(upcomingPlans, ideals)

  return (
    <div className="recent-plans-screen">
      <h1 className="plans-screen__title">今後の予定</h1>

      <div className="plans-screen__list">
        {planGroups.length === 0 ? (
          <p className="plans-screen__empty">登録されている予定はありません</p>
        ) : (
          planGroups.map((group) => {
            const isToday = group.date === todayString
            return (
              <section
                key={group.date}
                className={
                  isToday ? 'review-card review-card--today' : 'review-card'
                }
              >
                <h2
                  className={
                    isToday
                      ? 'review-card__date review-card__date--today'
                      : 'review-card__date'
                  }
                >
                  {formatPlanDateLabel(group.date)}
                </h2>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="review-card__body"
                    onClick={() => onEditPlan?.(item.plan)}
                  >
                    <span
                      className={`plans-item__icon plans-item__icon--${item.color}`}
                      aria-hidden="true"
                    />
                    <span>{item.title}</span>
                  </button>
                ))}
              </section>
            )
          })
        )}
      </div>

      {ideals.length > 0 && (
        <button
          type="button"
          className="home-action plans-screen__action"
          onClick={onOpenPlanModal}
        >
          <img className="home-action__icon" src={footprints} alt="" />
          新しい予定を登録する
        </button>
      )}

      <nav className="bottom-nav plans-screen__nav" aria-label="サブメニュー">
        <button
          type="button"
          className="bottom-nav__item"
          onClick={() => onNavigate('home')}
        >
          ホームに戻る
        </button>
        <button
          type="button"
          className="bottom-nav__item"
          onClick={() => onNavigate('reviewPlans')}
        >
          予定の見直し
        </button>
      </nav>
    </div>
  )
}

export function ReviewPlansScreen({
  onNavigate,
  plans,
  ideals,
  onEditPlan,
}: ScreenProps) {
  const todayString = getTodayDateString()
  const overduePlans = plans.filter(
    (plan) => plan.status === 'active' && plan.date < todayString,
  )
  const planGroups = buildPlanGroups(overduePlans, ideals)

  return (
    <div className="review-plans-screen">
      <h1 className="plans-screen__title">予定の見直し</h1>

      <div className="plans-screen__list">
        {planGroups.length === 0 ? (
          <p className="plans-screen__empty">見直しが必要な予定はありません</p>
        ) : (
          planGroups.map((group) => (
            <section key={group.date} className="review-card">
              <h2 className="review-card__date">
                {formatPlanDateLabel(group.date)}
              </h2>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="review-card__body"
                  onClick={() => onEditPlan?.(item.plan)}
                >
                  <span
                    className={`plans-item__icon plans-item__icon--${item.color}`}
                    aria-hidden="true"
                  />
                  <span>{item.title}</span>
                </button>
              ))}
            </section>
          ))
        )}
      </div>

      <nav className="bottom-nav plans-screen__nav" aria-label="サブメニュー">
        <button
          type="button"
          className="bottom-nav__item"
          onClick={() => onNavigate('home')}
        >
          ホームに戻る
        </button>
        <button
          type="button"
          className="bottom-nav__item"
          onClick={() => onNavigate('recentPlans')}
        >
          今後の予定
        </button>
      </nav>
    </div>
  )
}
