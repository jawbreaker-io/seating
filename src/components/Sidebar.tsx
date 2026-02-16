import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Employee } from '../types'
import { EmployeeChip } from './EmployeeChip'
import { HiSearch, HiUserGroup } from 'react-icons/hi'

interface SidebarProps {
  unassigned: Employee[]
  getDepartmentColor: (department: string) => string
  onReset: () => void
  onClear: () => void
}

export function Sidebar({ unassigned, getDepartmentColor, onReset, onClear }: SidebarProps) {
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState<string>('')

  const departments = [...new Set(unassigned.map((e) => e.department))].sort()

  const filtered = unassigned.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase())
    const matchesDept = !filterDept || e.department === filterDept
    return matchesSearch && matchesDept
  })

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <HiUserGroup className="text-gray-500 text-lg" />
          <h2 className="text-base font-semibold text-gray-700">
            Unassigned ({unassigned.length})
          </h2>
        </div>

        <div className="relative mb-2">
          <HiSearch className="absolute left-2.5 top-2.5 text-gray-400 text-base" />
          <input
            data-testid="search-input"
            type="text"
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
          />
        </div>

        {departments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterDept('')}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                !filterDept
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setFilterDept(dept === filterDept ? '' : dept)}
                className="text-xs px-2.5 py-1 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    filterDept === dept
                      ? getDepartmentColor(dept)
                      : undefined,
                  color: filterDept === dept ? 'white' : getDepartmentColor(dept),
                  border: `1px solid ${getDepartmentColor(dept)}`,
                }}
              >
                {dept}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            <div className="flex flex-col gap-2">
              {filtered.map((emp) => (
                <motion.div
                  key={emp.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <EmployeeChip employee={emp} getDepartmentColor={getDepartmentColor} sourceDeskId={null} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {emp.name}
                    </p>
                    <p
                      className="text-xs font-medium"
                      style={{ color: getDepartmentColor(emp.department) }}
                    >
                      {emp.department}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-400 text-center mt-8"
            >
              {unassigned.length === 0
                ? 'Everyone is seated!'
                : 'No matches found'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 border-t border-gray-200 flex gap-2">
        <button
          data-testid="reset-btn"
          onClick={onReset}
          className="flex-1 text-sm px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          Reset Default
        </button>
        <button
          data-testid="clear-btn"
          onClick={onClear}
          className="flex-1 text-sm px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
        >
          Clear All
        </button>
      </div>
    </aside>
  )
}
