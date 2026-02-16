import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { HiPlus, HiTrash, HiX, HiUserGroup, HiColorSwatch, HiPencil, HiCheck } from 'react-icons/hi'
import type { Employee } from '../types'

const DEPT_COLORS = [
  '#3b82f6',
  '#a855f7',
  '#f97316',
  '#10b981',
  '#ec4899',
  '#eab308',
  '#06b6d4',
  '#6366f1',
  '#ef4444',
  '#84cc16',
  '#f59e0b',
  '#8b5cf6',
]

type Tab = 'people' | 'departments'

interface PeopleEditorProps {
  employees: Employee[]
  departments: string[]
  departmentColors: Record<string, string>
  getDepartmentColor: (dept: string) => string
  onAddEmployee: (name: string, department: string) => void
  onUpdateEmployee: (id: string, updates: Partial<Omit<Employee, 'id'>>) => void
  onRemoveEmployee: (id: string) => void
  onAddDepartment: (name: string, color: string) => void
  onRenameDepartment: (oldName: string, newName: string) => void
  onSetDepartmentColor: (department: string, color: string) => void
  onRemoveDepartment: (name: string) => void
  onResetPeople: () => void
  onClose: () => void
}

export function PeopleEditor({
  employees,
  departments,
  departmentColors,
  getDepartmentColor,
  onAddEmployee,
  onUpdateEmployee,
  onRemoveEmployee,
  onAddDepartment,
  onRenameDepartment,
  onSetDepartmentColor,
  onRemoveDepartment,
  onResetPeople,
  onClose,
}: PeopleEditorProps) {
  const [tab, setTab] = useState<Tab>('people')
  const [newName, setNewName] = useState('')
  const [newDept, setNewDept] = useState(departments[0] ?? '')
  const [newDeptName, setNewDeptName] = useState('')
  const [newDeptColor, setNewDeptColor] = useState(DEPT_COLORS[0])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteDept, setConfirmDeleteDept] = useState<string | null>(null)
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDept, setEditDept] = useState('')
  const [editingDeptName, setEditingDeptName] = useState<string | null>(null)
  const [editDeptNameValue, setEditDeptNameValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const handleAddEmployee = () => {
    const trimmed = newName.trim()
    if (!trimmed || !newDept) return
    onAddEmployee(trimmed, newDept)
    setNewName('')
  }

  const handleAddDepartment = () => {
    const trimmed = newDeptName.trim()
    if (!trimmed) return
    if (departments.includes(trimmed)) return
    onAddDepartment(trimmed, newDeptColor)
    setNewDeptName('')
    // Pick next unused color
    const usedColors = new Set(Object.values(departmentColors))
    const nextColor = DEPT_COLORS.find((c) => !usedColors.has(c)) ?? DEPT_COLORS[0]
    setNewDeptColor(nextColor)
  }

  const handleDeleteEmployee = (id: string) => {
    if (confirmDeleteId === id) {
      onRemoveEmployee(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
    }
  }

  const handleDeleteDepartment = (name: string) => {
    if (confirmDeleteDept === name) {
      onRemoveDepartment(name)
      setConfirmDeleteDept(null)
    } else {
      setConfirmDeleteDept(name)
    }
  }

  const startEditEmployee = (emp: Employee) => {
    setEditingEmployeeId(emp.id)
    setEditName(emp.name)
    setEditDept(emp.department)
  }

  const saveEditEmployee = () => {
    if (!editingEmployeeId) return
    const trimmed = editName.trim()
    if (!trimmed || !editDept) return
    onUpdateEmployee(editingEmployeeId, { name: trimmed, department: editDept })
    setEditingEmployeeId(null)
  }

  const startEditDeptName = (dept: string) => {
    setEditingDeptName(dept)
    setEditDeptNameValue(dept)
  }

  const saveEditDeptName = () => {
    if (!editingDeptName) return
    const trimmed = editDeptNameValue.trim()
    if (!trimmed || trimmed === editingDeptName) {
      setEditingDeptName(null)
      return
    }
    if (departments.includes(trimmed)) {
      setEditingDeptName(null)
      return
    }
    onRenameDepartment(editingDeptName, trimmed)
    setEditingDeptName(null)
  }

  const filteredEmployees = employees.filter((e) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      e.name.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    )
  })

  const employeeCountByDept = (dept: string) =>
    employees.filter((e) => e.department === dept).length

  return (
    <motion.div
      data-testid="people-editor-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        data-testid="people-editor"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-800">
            Edit People & Departments
          </h2>
          <button
            data-testid="people-editor-close"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <HiX className="text-gray-500 text-lg" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-5">
          <button
            data-testid="tab-people"
            onClick={() => setTab('people')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'people'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <HiUserGroup className="text-sm" />
            People ({employees.length})
          </button>
          <button
            data-testid="tab-departments"
            onClick={() => setTab('departments')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'departments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <HiColorSwatch className="text-sm" />
            Departments ({departments.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'people' && (
            <div className="space-y-3">
              {/* Add new person form */}
              <div className="flex items-end gap-2 p-3 bg-blue-50 rounded-xl">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 block mb-1">Name</label>
                  <input
                    data-testid="new-employee-name"
                    type="text"
                    placeholder="Full name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddEmployee()}
                    className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="w-40">
                  <label className="text-[10px] text-gray-500 block mb-1">Department</label>
                  <select
                    data-testid="new-employee-dept"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  data-testid="add-employee-btn"
                  onClick={handleAddEmployee}
                  disabled={!newName.trim() || !newDept}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <HiPlus className="text-sm" />
                  Add
                </button>
              </div>

              {/* Search */}
              <input
                data-testid="people-search"
                type="text"
                placeholder="Search by name or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />

              {/* Employee list */}
              <AnimatePresence mode="popLayout">
                {filteredEmployees.map((emp) => (
                  <motion.div
                    key={emp.id}
                    data-testid={`employee-row-${emp.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: getDepartmentColor(emp.department) }}
                    >
                      {emp.avatar}
                    </div>

                    {editingEmployeeId === emp.id ? (
                      /* Edit mode */
                      <>
                        <input
                          data-testid={`edit-employee-name-${emp.id}`}
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditEmployee()}
                          className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                          autoFocus
                        />
                        <select
                          data-testid={`edit-employee-dept-${emp.id}`}
                          value={editDept}
                          onChange={(e) => setEditDept(e.target.value)}
                          className="w-32 text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          {departments.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                        <button
                          data-testid={`save-employee-${emp.id}`}
                          onClick={saveEditEmployee}
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                        >
                          <HiCheck className="text-sm" />
                        </button>
                        <button
                          onClick={() => setEditingEmployeeId(null)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                        >
                          <HiX className="text-sm" />
                        </button>
                      </>
                    ) : (
                      /* View mode */
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {emp.name}
                          </p>
                          <p
                            className="text-[10px] font-medium"
                            style={{ color: getDepartmentColor(emp.department) }}
                          >
                            {emp.department}
                          </p>
                        </div>
                        <button
                          data-testid={`edit-employee-${emp.id}`}
                          onClick={() => startEditEmployee(emp)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <HiPencil className="text-sm" />
                        </button>
                        <button
                          data-testid={`delete-employee-${emp.id}`}
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            confirmDeleteId === emp.id
                              ? 'bg-red-500 text-white'
                              : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                          }`}
                          title={
                            confirmDeleteId === emp.id
                              ? 'Click again to confirm'
                              : 'Delete person'
                          }
                        >
                          <HiTrash className="text-sm" />
                        </button>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredEmployees.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  {employees.length === 0
                    ? 'No people added yet.'
                    : 'No matches found.'}
                </p>
              )}
            </div>
          )}

          {tab === 'departments' && (
            <div className="space-y-3">
              {/* Add new department form */}
              <div className="flex items-end gap-2 p-3 bg-purple-50 rounded-xl">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 block mb-1">Department Name</label>
                  <input
                    data-testid="new-dept-name"
                    type="text"
                    placeholder="e.g., Research"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
                    className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Color</label>
                  <div className="flex gap-1">
                    {DEPT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewDeptColor(color)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${
                          newDeptColor === color
                            ? 'border-gray-600 scale-125'
                            : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  data-testid="add-dept-btn"
                  onClick={handleAddDepartment}
                  disabled={!newDeptName.trim() || departments.includes(newDeptName.trim())}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <HiPlus className="text-sm" />
                  Add
                </button>
              </div>

              {/* Department list */}
              <AnimatePresence mode="popLayout">
                {departments.map((dept) => (
                  <motion.div
                    key={dept}
                    data-testid={`dept-row-${dept}`}
                    className="rounded-xl border border-gray-100 p-3"
                    style={{ backgroundColor: getDepartmentColor(dept) + '15' }}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Color indicator */}
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getDepartmentColor(dept) }}
                      />

                      {editingDeptName === dept ? (
                        /* Edit mode */
                        <>
                          <input
                            data-testid={`edit-dept-name-${dept}`}
                            type="text"
                            value={editDeptNameValue}
                            onChange={(e) => setEditDeptNameValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditDeptName()}
                            className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-300"
                            autoFocus
                          />
                          <button
                            data-testid={`save-dept-${dept}`}
                            onClick={saveEditDeptName}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <HiCheck className="text-sm" />
                          </button>
                          <button
                            onClick={() => setEditingDeptName(null)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                          >
                            <HiX className="text-sm" />
                          </button>
                        </>
                      ) : (
                        /* View mode */
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">
                              {dept}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {employeeCountByDept(dept)} {employeeCountByDept(dept) === 1 ? 'person' : 'people'}
                            </p>
                          </div>
                          <button
                            data-testid={`edit-dept-${dept}`}
                            onClick={() => startEditDeptName(dept)}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-purple-500 hover:bg-purple-50 transition-colors"
                            title="Rename department"
                          >
                            <HiPencil className="text-sm" />
                          </button>
                          <button
                            data-testid={`delete-dept-${dept}`}
                            onClick={() => handleDeleteDepartment(dept)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              confirmDeleteDept === dept
                                ? 'bg-red-500 text-white'
                                : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                            }`}
                            title={
                              confirmDeleteDept === dept
                                ? `Click again to delete (removes ${employeeCountByDept(dept)} people)`
                                : 'Delete department'
                            }
                          >
                            <HiTrash className="text-sm" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Color picker */}
                    {editingDeptName !== dept && (
                      <div className="flex items-center gap-1.5 mt-2 ml-9">
                        <span className="text-[10px] text-gray-500 mr-1">Color</span>
                        {DEPT_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => onSetDepartmentColor(dept, color)}
                            className={`w-4 h-4 rounded-full border-2 transition-transform ${
                              getDepartmentColor(dept) === color
                                ? 'border-gray-600 scale-125'
                                : 'border-transparent hover:scale-110'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {departments.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  No departments yet. Add one to get started.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-2">
          <div className="flex-1" />
          <button
            data-testid="reset-people-btn"
            onClick={onResetPeople}
            className="text-xs px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Reset Default
          </button>
          <button
            data-testid="people-done-btn"
            onClick={onClose}
            className="text-xs px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
