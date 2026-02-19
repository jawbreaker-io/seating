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
    <aside className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <HiUserGroup className="text-gray-500 dark:text-gray-400 text-xl" />
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Unassigned ({unassigned.length})
          </h2>
        </div>

        <div className="relative mb-2">
          <HiSearch className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500 text-lg" />
          <input
            data-testid="search-input"
            type="text"
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
          />
        </div>

        {departments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterDept('')}
              className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                !filterDept
                  ? 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-800'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setFilterDept(dept === filterDept ? '' : dept)}
                className="text-sm px-3 py-1.5 rounded-full transition-colors"
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
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <EmployeeChip employee={emp} getDepartmentColor={getDepartmentColor} sourceDeskId={null} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
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
              className="text-sm text-gray-400 dark:text-gray-500 text-center mt-8"
            >
              {unassigned.length === 0
                ? 'Everyone is seated!'
                : 'No matches found'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <button
          data-testid="reset-btn"
          onClick={onReset}
          className="flex-1 text-sm px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
        >
          Reset Default
        </button>
        <button
          data-testid="clear-btn"
          onClick={onClear}
          className="flex-1 text-sm px-4 py-2.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors font-medium"
        >
          Clear All
        </button>
      </div>
    </aside>
  )
}
