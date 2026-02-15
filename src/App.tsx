import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence } from 'motion/react'
import { DragProvider } from './DragContext'
import { useLayoutStore } from './useLayoutStore'
import { useSeatingStore } from './useSeatingStore'
import { Header } from './components/Header'
import { FloorPlan } from './components/FloorPlan'
import { Sidebar } from './components/Sidebar'
import { LayoutEditor } from './components/LayoutEditor'
import { getSharedSeating } from './shareUtils'

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
  } = useLayoutStore()

  const {
    seating,
    assignEmployee,
    unassignEmployee,
    resetSeating,
    clearAll,
    loadShared,
    unassignedEmployees,
    getEmployeeForDesk,
  } = useSeatingStore(desks)

  const [showLayoutEditor, setShowLayoutEditor] = useState(false)

  const loadedRef = useRef(false)
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    const shared = getSharedSeating(desks)
    if (shared) {
      const hasUserData = localStorage.getItem('seating-chart-assignments') !== null
      const shouldLoad =
        !hasUserData ||
        window.confirm(
          'A shared arrangement was found in the link. Load it? This will replace your current arrangement.',
        )
      if (shouldLoad) {
        loadShared(shared)
      }
      // Clear the hash regardless so subsequent reloads use localStorage
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [loadShared, desks])

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
          desks={desks}
          unavailableDesks={unavailableDesks}
          onImport={loadShared}
          onEditLayout={() => setShowLayoutEditor(true)}
        />
        <div className="flex flex-1 overflow-hidden">
          <FloorPlan
            zones={zones}
            desks={desks}
            deskNames={deskNames}
            unavailableDesks={unavailableDesks}
            getEmployee={getEmployeeForDesk}
            onDrop={assignEmployee}
            onRemove={unassignEmployee}
            onDeskNameChange={setDeskName}
            onToggleDeskUnavailable={handleToggleDeskUnavailable}
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
    </DragProvider>
  )
}

export default App
