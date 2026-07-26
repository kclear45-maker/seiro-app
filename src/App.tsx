import { useState } from 'react'
import './App.css'
import HomeScreen, { type AppScreen } from './HomeScreen'
import RegisterIdealFlow from './RegisterIdealFlow'
import { RecentPlansScreen, ReviewPlansScreen } from './screens'
import PlanRegisterModal, { type PlanModalMode } from './PlanRegisterModal'
import { loadAppData } from './storage'
import type { AppData, Plan } from './types'

function App() {
  const [screen, setScreen] = useState<AppScreen>('home')
  const [appData, setAppData] = useState<AppData>(() => loadAppData())
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [planModalMode, setPlanModalMode] = useState<PlanModalMode>('create')
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)

  function handleIdealRegistered(nextData: AppData) {
    setAppData(nextData)
    setScreen('home')
  }

  function openCreatePlanModal() {
    setPlanModalMode('create')
    setEditingPlan(null)
    setIsPlanModalOpen(true)
  }

  function openEditPlanModal(plan: Plan) {
    setPlanModalMode('edit')
    setEditingPlan(plan)
    setIsPlanModalOpen(true)
  }

  function closePlanModal() {
    setIsPlanModalOpen(false)
    setEditingPlan(null)
    setPlanModalMode('create')
  }

  function handlePlanSaved(nextData: AppData) {
    setAppData(nextData)
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        {screen === 'home' && (
          <HomeScreen
            onNavigate={setScreen}
            ideals={appData.ideals}
            waypoints={appData.waypoints}
            plans={appData.plans}
            onAppDataChange={setAppData}
            onOpenPlanModal={openCreatePlanModal}
          />
        )}
        {screen === 'registerIdeal' && (
          <RegisterIdealFlow
            onNavigate={setScreen}
            showBackToHome={appData.ideals.length > 0}
            onRegistered={handleIdealRegistered}
          />
        )}
        {screen === 'recentPlans' && (
          <RecentPlansScreen
            onNavigate={setScreen}
            plans={appData.plans}
            ideals={appData.ideals}
            onOpenPlanModal={openCreatePlanModal}
            onEditPlan={openEditPlanModal}
          />
        )}
        {screen === 'reviewPlans' && (
          <ReviewPlansScreen
            onNavigate={setScreen}
            plans={appData.plans}
            ideals={appData.ideals}
            onEditPlan={openEditPlanModal}
          />
        )}

        {isPlanModalOpen && (
          <PlanRegisterModal
            mode={planModalMode}
            ideals={appData.ideals}
            plan={editingPlan ?? undefined}
            onClose={closePlanModal}
            onSaved={handlePlanSaved}
          />
        )}
      </div>
    </div>
  )
}

export default App
