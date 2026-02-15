import { useEffect, useRef } from 'react'
import { DragProvider } from './DragContext'
import { useSeatingStore } from './useSeatingStore'
import { Header } from './components/Header'
import { FloorPlan } from './components/FloorPlan'
import { Sidebar } from './components/Sidebar'
import { getSharedSeating } from './shareUtils'

function App() {
  const {
    seating,
    assignEmployee,
    unassignEmployee,
    resetSeating,
    clearAll,
    loadShared,
    unassignedEmployees,
    getEmployeeForDesk,
  } = useSeatingStore()

  const loadedRef = useRef(false)
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    const shared = getSharedSeating()
    if (shared) {
      loadShared(shared)
      // Clear the hash so subsequent reloads use localStorage
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [loadShared])

  return (
    <DragProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        <Header seating={seating} onImport={loadShared} />
        <div className="flex flex-1 overflow-hidden">
          <FloorPlan
            getEmployee={getEmployeeForDesk}
            onDrop={assignEmployee}
            onRemove={unassignEmployee}
          />
          <Sidebar
            unassigned={unassignedEmployees}
            onReset={resetSeating}
            onClear={clearAll}
          />
        </div>
      </div>
    </DragProvider>
  )
}

export default App
