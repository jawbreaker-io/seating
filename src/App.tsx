import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence } from 'motion/react'
import { DragProvider } from './DragContext'
import { useLayoutStore } from './useLayoutStore'
import { useSeatingStore } from './useSeatingStore'
import { usePeopleStore } from './usePeopleStore'
import { Header } from './components/Header'
import { FloorPlan } from './components/FloorPlan'
import { Sidebar } from './components/Sidebar'
import { LayoutEditor } from './components/LayoutEditor'
import { OptimizePanel } from './components/OptimizePanel'
import { OptimizeAnimation } from './components/OptimizeAnimation'
import type { AnimationMove } from './components/OptimizeAnimation'
import type { SeatingMap } from './types'
import { PeopleEditor } from './components/PeopleEditor'
import { MovePlanPanel } from './components/MovePlanPanel'
import { MovePlanPage } from './components/MovePlanPage'
import { getSharedData, getMovePlanData } from './shareUtils'
import type { SharePayload, MovePlanPayload } from './shareUtils'
import { useDefaultLayout } from './useDefaultLayout'

function App() {
  // Check if we're on a move plan URL — if so, render the standalone page
  const [movePlanPayload] = useState<MovePlanPayload | null>(() => getMovePlanData())
  if (movePlanPayload) {
    return <MovePlanPage payload={movePlanPayload} />
  }

  return <AppMain />
}

function AppMain() {
  const {
    zones,
    desks,
    deskNames,
    unavailableDesks,
    addZone,
    updateZone,
    removeZone,
    resetLayout,
    setDeskName,
    setDeskUnavailable,
    loadSharedLayout,
  } = useLayoutStore()

  const {
    employees,
    departmentColors,
    departments,
    getDepartmentColor,
    addEmployee,
    updateEmployee,
    removeEmployee,
    setDepartmentColor,
    addDepartment,
    renameDepartment,
    removeDepartment,
    resetPeople,
    loadSharedPeople,
  } = usePeopleStore()

  const {
    seating,
    pinnedDesks,
    assignEmployee,
    unassignEmployee,
    togglePin,
    resetSeating,
    clearAll,
    loadShared,
    loadSharedPins,
    unassignedEmployees,
    getEmployeeForDesk,
  } = useSeatingStore(desks, employees)

  const [showLayoutEditor, setShowLayoutEditor] = useState(false)
  const [showOptimizer, setShowOptimizer] = useState(false)
  const [showPeopleEditor, setShowPeopleEditor] = useState(false)
  const [showMovePlanner, setShowMovePlanner] = useState(false)
  const [pendingOptimization, setPendingOptimization] = useState<{
    seating: SeatingMap
    moves: AnimationMove[]
  } | null>(null)

  const loadSharePayload = useCallback(
    (shared: SharePayload) => {
      if (shared.zones.length > 0) {
        loadSharedLayout(shared.zones, shared.deskNames, shared.unavailableDesks)
      }
      loadShared(shared.seating)
      loadSharedPins(shared.pinnedDesks ?? {})
      if (shared.employees && shared.departmentColors) {
        loadSharedPeople(shared.employees, shared.departmentColors)
      }
    },
    [loadShared, loadSharedLayout, loadSharedPins, loadSharedPeople],
  )

  const loadedRef = useRef(false)
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    const shared = getSharedData()
    if (shared) {
      const hasUserData = localStorage.getItem('seating-chart-assignments') !== null
      const shouldLoad =
        !hasUserData ||
        window.confirm(
          'A shared arrangement was found in the link. Load it? This will replace your current arrangement.',
        )
      if (shouldLoad) {
        loadSharePayload(shared)
      }
      // Clear the hash regardless so subsequent reloads use localStorage
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [loadSharePayload])

  // Reset everything to hardcoded defaults (used as fallback when no
  // default-layout.json is available)
  const fallbackReset = useCallback(() => {
    resetLayout()
    resetSeating()
    resetPeople()
  }, [resetLayout, resetSeating, resetPeople])

  // On first visit with no saved data, load /default-layout.json if mounted.
  // Also provides resetToDefault for the "Reset Default" button.
  const { resetToDefault } = useDefaultLayout(loadSharePayload, fallbackReset)

  // When a desk is marked unavailable, unassign any employee sitting there
  const handleToggleDeskUnavailable = useCallback(
    (deskId: string, unavailable: boolean) => {
      if (unavailable && seating[deskId]) {
        unassignEmployee(deskId)
      }
      setDeskUnavailable(deskId, unavailable)
    },
    [seating, unassignEmployee, setDeskUnavailable],
  )

  // When the user applies an optimization, close the panel and start the move animation
  const handleOptimizeApply = useCallback(
    (newSeating: SeatingMap, moves: AnimationMove[]) => {
      setShowOptimizer(false)
      if (moves.length > 0) {
        setPendingOptimization({ seating: newSeating, moves })
      } else {
        loadShared(newSeating)
      }
    },
    [loadShared],
  )

  // When the animation finishes, apply the final seating arrangement
  const handleAnimationComplete = useCallback(() => {
    if (pendingOptimization) {
      loadShared(pendingOptimization.seating)
      setPendingOptimization(null)
    }
  }, [pendingOptimization, loadShared])

  return (
    <DragProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        <Header
          seating={seating}
          zones={zones}
          desks={desks}
          deskNames={deskNames}
          unavailableDesks={unavailableDesks}
          pinnedDesks={pinnedDesks}
          employees={employees}
          departmentColors={departmentColors}
          onImport={loadSharePayload}
          onEditLayout={() => setShowLayoutEditor(true)}
          onEditPeople={() => setShowPeopleEditor(true)}
          onOptimize={() => setShowOptimizer(true)}
          onMovePlanner={() => setShowMovePlanner(true)}
        />
        <div className="flex flex-1 overflow-hidden">
          <FloorPlan
            zones={zones}
            desks={desks}
            deskNames={deskNames}
            unavailableDesks={unavailableDesks}
            pinnedDesks={pinnedDesks}
            getEmployee={getEmployeeForDesk}
            getDepartmentColor={getDepartmentColor}
            onDrop={assignEmployee}
            onRemove={unassignEmployee}
            onDeskNameChange={setDeskName}
            onToggleDeskUnavailable={handleToggleDeskUnavailable}
            onTogglePin={togglePin}
          />
          <Sidebar
            unassigned={unassignedEmployees}
            getDepartmentColor={getDepartmentColor}
            onReset={resetToDefault}
            onClear={clearAll}
          />
        </div>
      </div>
      <AnimatePresence>
        {showLayoutEditor && (
          <LayoutEditor
            zones={zones}
            onAddZone={addZone}
            onUpdateZone={updateZone}
            onRemoveZone={removeZone}
            onResetLayout={resetLayout}
            onClose={() => setShowLayoutEditor(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showOptimizer && (
          <OptimizePanel
            seating={seating}
            desks={desks}
            deskNames={deskNames}
            pinnedDesks={pinnedDesks}
            unavailableDesks={unavailableDesks}
            employees={employees}
            onApply={handleOptimizeApply}
            onClose={() => setShowOptimizer(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPeopleEditor && (
          <PeopleEditor
            employees={employees}
            departments={departments}
            departmentColors={departmentColors}
            getDepartmentColor={getDepartmentColor}
            onAddEmployee={addEmployee}
            onUpdateEmployee={updateEmployee}
            onRemoveEmployee={removeEmployee}
            onAddDepartment={addDepartment}
            onRenameDepartment={renameDepartment}
            onSetDepartmentColor={setDepartmentColor}
            onRemoveDepartment={removeDepartment}
            onResetPeople={resetPeople}
            onClose={() => setShowPeopleEditor(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {pendingOptimization && (
          <OptimizeAnimation
            moves={pendingOptimization.moves}
            employees={employees}
            getDepartmentColor={getDepartmentColor}
            onComplete={handleAnimationComplete}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showMovePlanner && (
          <MovePlanPanel
            zones={zones}
            deskNames={deskNames}
            employees={employees}
            departmentColors={departmentColors}
            getDepartmentColor={getDepartmentColor}
            onClose={() => setShowMovePlanner(false)}
          />
        )}
      </AnimatePresence>
    </DragProvider>
  )
}

export default App
