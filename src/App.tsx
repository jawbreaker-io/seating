import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence } from 'motion/react'
import { DragProvider } from './DragContext'
import { useLayoutStore } from './useLayoutStore'
import { useSeatingStore } from './useSeatingStore'
import { Header } from './components/Header'
import { FloorPlan } from './components/FloorPlan'
import { Sidebar } from './components/Sidebar'
import { LayoutEditor } from './components/LayoutEditor'
import { OptimizePanel } from './components/OptimizePanel'
import { getSharedData } from './shareUtils'

function App() {
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
  } = useSeatingStore(desks)

  const [showLayoutEditor, setShowLayoutEditor] = useState(false)
  const [showOptimizer, setShowOptimizer] = useState(false)

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
        if (shared.zones.length > 0) {
          loadSharedLayout(shared.zones, shared.deskNames, shared.unavailableDesks)
        }
        loadShared(shared.seating)
        if (shared.pinnedDesks) {
          loadSharedPins(shared.pinnedDesks)
        }
      }
      // Clear the hash regardless so subsequent reloads use localStorage
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [loadShared, loadSharedLayout, loadSharedPins])

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
          onImport={loadShared}
          onEditLayout={() => setShowLayoutEditor(true)}
          onOptimize={() => setShowOptimizer(true)}
        />
        <div className="flex flex-1 overflow-hidden">
          <FloorPlan
            zones={zones}
            desks={desks}
            deskNames={deskNames}
            unavailableDesks={unavailableDesks}
            pinnedDesks={pinnedDesks}
            getEmployee={getEmployeeForDesk}
            onDrop={assignEmployee}
            onRemove={unassignEmployee}
            onDeskNameChange={setDeskName}
            onToggleDeskUnavailable={handleToggleDeskUnavailable}
            onTogglePin={togglePin}
          />
          <Sidebar
            unassigned={unassignedEmployees}
            onReset={resetSeating}
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
            pinnedDesks={pinnedDesks}
            unavailableDesks={unavailableDesks}
            onApply={loadShared}
            onClose={() => setShowOptimizer(false)}
          />
        )}
      </AnimatePresence>
    </DragProvider>
  )
}

export default App
