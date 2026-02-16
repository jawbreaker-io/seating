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
import { PeopleEditor } from './components/PeopleEditor'
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
        if (shared.employees && shared.departmentColors) {
          loadSharedPeople(shared.employees, shared.departmentColors)
        }
      }
      // Clear the hash regardless so subsequent reloads use localStorage
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [loadShared, loadSharedLayout, loadSharedPins, loadSharedPeople])

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
          employees={employees}
          departmentColors={departmentColors}
          onImport={loadShared}
          onEditLayout={() => setShowLayoutEditor(true)}
          onEditPeople={() => setShowPeopleEditor(true)}
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
            employees={employees}
            onApply={loadShared}
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
    </DragProvider>
  )
}

export default App
