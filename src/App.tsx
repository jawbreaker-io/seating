import { DragProvider } from './DragContext'
import { useSeatingStore } from './useSeatingStore'
import { Header } from './components/Header'
import { FloorPlan } from './components/FloorPlan'
import { Sidebar } from './components/Sidebar'

function App() {
  const {
    seating,
    assignEmployee,
    unassignEmployee,
    resetSeating,
    clearAll,
    unassignedEmployees,
    getEmployeeForDesk,
  } = useSeatingStore()

  return (
    <DragProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        <Header seating={seating} />
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
