import { useState, useCallback, useMemo } from 'react'
import { motion } from 'motion/react'
import { HiSwitchHorizontal, HiUpload, HiCheck, HiExternalLink } from 'react-icons/hi'
import type { Employee, DeskNameMap, Zone } from '../types'
import { parseJsonConfig, buildMovePlanUrl } from '../shareUtils'
import type { SharePayload } from '../shareUtils'
import { computeMovePlan } from '../moveOptimizer'
import type { MovePlan } from '../moveOptimizer'

interface MovePlanPanelProps {
  zones: Zone[]
  deskNames: DeskNameMap
  employees: Employee[]
  departmentColors: Record<string, string>
  getDepartmentColor: (dept: string) => string
  onClose: () => void
}

interface LoadedFile {
  name: string
  payload: SharePayload
}

function loadFile(): Promise<{ name: string; payload: SharePayload }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string)
          if (typeof parsed !== 'object' || parsed === null) {
            reject(new Error('Invalid JSON'))
            return
          }
          resolve({
            name: file.name,
            payload: parseJsonConfig(parsed as Record<string, unknown>),
          })
        } catch {
          reject(new Error('Invalid JSON file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    }
    input.click()
  })
}

export function MovePlanPanel({
  zones,
  deskNames,
  employees,
  departmentColors,
  getDepartmentColor,
  onClose,
}: MovePlanPanelProps) {
  const [originalFile, setOriginalFile] = useState<LoadedFile | null>(null)
  const [newFile, setNewFile] = useState<LoadedFile | null>(null)
  const [copied, setCopied] = useState(false)

  const handleLoadOriginal = useCallback(async () => {
    try {
      const result = await loadFile()
      setOriginalFile(result)
    } catch {
      // user cancelled or invalid file
    }
  }, [])

  const handleLoadNew = useCallback(async () => {
    try {
      const result = await loadFile()
      setNewFile(result)
    } catch {
      // user cancelled or invalid file
    }
  }, [])

  // Merge employees from both files with current app employees
  const mergedEmployees = useMemo(() => {
    const empMap = new Map(employees.map((e) => [e.id, e]))
    if (originalFile?.payload.employees) {
      for (const e of originalFile.payload.employees) {
        if (!empMap.has(e.id)) empMap.set(e.id, e)
      }
    }
    if (newFile?.payload.employees) {
      for (const e of newFile.payload.employees) {
        if (!empMap.has(e.id)) empMap.set(e.id, e)
      }
    }
    return [...empMap.values()]
  }, [employees, originalFile, newFile])

  // Merge desk names
  const mergedDeskNames = useMemo(() => {
    const names = { ...deskNames }
    if (originalFile?.payload.deskNames) {
      Object.assign(names, originalFile.payload.deskNames)
    }
    if (newFile?.payload.deskNames) {
      Object.assign(names, newFile.payload.deskNames)
    }
    return names
  }, [deskNames, originalFile, newFile])

  const movePlan: MovePlan | null = useMemo(() => {
    if (!originalFile || !newFile) return null
    return computeMovePlan(
      originalFile.payload.seating,
      newFile.payload.seating,
      mergedEmployees,
      mergedDeskNames,
    )
  }, [originalFile, newFile, mergedEmployees, mergedDeskNames])

  const handleCopyLink = useCallback(async () => {
    if (!originalFile || !newFile) return
    const url = buildMovePlanUrl({
      originalSeating: originalFile.payload.seating,
      newSeating: newFile.payload.seating,
      employees: mergedEmployees,
      zones: newFile.payload.zones.length > 0 ? newFile.payload.zones : zones,
      deskNames: mergedDeskNames,
      departmentColors,
    })
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = url
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [originalFile, newFile, mergedEmployees, zones, mergedDeskNames, departmentColors])

  const handleOpenInNewTab = useCallback(() => {
    if (!originalFile || !newFile) return
    const url = buildMovePlanUrl({
      originalSeating: originalFile.payload.seating,
      newSeating: newFile.payload.seating,
      employees: mergedEmployees,
      zones: newFile.payload.zones.length > 0 ? newFile.payload.zones : zones,
      deskNames: mergedDeskNames,
      departmentColors,
    })
    window.open(url, '_blank')
  }, [originalFile, newFile, mergedEmployees, zones, mergedDeskNames, departmentColors])

  const empMap = useMemo(() => new Map(mergedEmployees.map((e) => [e.id, e])), [mergedEmployees])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl w-[580px] max-h-[85vh] flex flex-col overflow-hidden"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <HiSwitchHorizontal className="text-indigo-500 text-xl" />
            <h2 className="text-lg font-bold text-gray-800">Desk Move Planner</h2>
          </div>
          <p className="text-sm text-gray-500">
            Upload two arrangement files to generate an optimal move order
          </p>
        </div>

        {/* File upload area */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex gap-3">
            <button
              data-testid="load-original-btn"
              onClick={handleLoadOriginal}
              className={`flex-1 p-4 rounded-xl border-2 border-dashed transition-all text-left ${
                originalFile
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {originalFile ? (
                  <HiCheck className="text-green-500 text-base" />
                ) : (
                  <HiUpload className="text-gray-400 text-base" />
                )}
                <span className={`text-sm font-semibold ${originalFile ? 'text-green-700' : 'text-gray-700'}`}>
                  Current Layout
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {originalFile ? originalFile.name : 'Click to upload JSON'}
              </p>
            </button>
            <button
              data-testid="load-new-btn"
              onClick={handleLoadNew}
              className={`flex-1 p-4 rounded-xl border-2 border-dashed transition-all text-left ${
                newFile
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {newFile ? (
                  <HiCheck className="text-green-500 text-base" />
                ) : (
                  <HiUpload className="text-gray-400 text-base" />
                )}
                <span className={`text-sm font-semibold ${newFile ? 'text-green-700' : 'text-gray-700'}`}>
                  New Layout
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {newFile ? newFile.name : 'Click to upload JSON'}
              </p>
            </button>
          </div>
        </div>

        {/* Summary stats */}
        {movePlan && (
          <div className="px-5 pb-3">
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                <div className="text-lg font-bold text-gray-800">{movePlan.summary.totalSteps}</div>
                <div className="text-[10px] text-gray-500 font-medium">Total Steps</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                <div className="text-lg font-bold text-blue-600">{movePlan.summary.peopleMoving}</div>
                <div className="text-[10px] text-gray-500 font-medium">Desk Moves</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                <div className="text-lg font-bold text-amber-600">{movePlan.summary.cyclesDetected}</div>
                <div className="text-[10px] text-gray-500 font-medium">Cycles</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                <div className="text-lg font-bold text-green-600">{movePlan.summary.unchanged}</div>
                <div className="text-[10px] text-gray-500 font-medium">Unchanged</div>
              </div>
            </div>
          </div>
        )}

        {/* Move list */}
        <div className="flex-1 overflow-y-auto px-5 pb-3">
          {movePlan ? (
            movePlan.steps.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Move Order
                </p>
                {movePlan.steps.map((step, i) => {
                  const emp = empMap.get(step.employeeId)
                  return (
                    <motion.div
                      key={`${step.step}-${step.employeeId}`}
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 text-sm"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <span className="text-xs font-bold text-gray-400 w-6 text-right flex-shrink-0">
                        {step.step}.
                      </span>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: emp ? getDepartmentColor(emp.department) : '#6b7280' }}
                      >
                        {emp?.avatar ?? '??'}
                      </div>
                      <span className="font-medium text-gray-700 flex-1 truncate">{step.employeeName}</span>
                      <span className="text-gray-400 text-xs flex-shrink-0">
                        {step.fromDeskLabel}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-gray-300 flex-shrink-0">
                        <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700 text-xs font-medium flex-shrink-0">
                        {step.toDeskLabel}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <HiCheck className="text-3xl text-green-400 mb-2" />
                <p className="text-sm font-medium">Layouts are identical!</p>
                <p className="text-xs">No moves needed</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <HiSwitchHorizontal className="text-3xl mb-2" />
              <p className="text-sm font-medium">Upload both files to generate a move plan</p>
              <p className="text-xs mt-1">Use Share &gt; Export as JSON to create arrangement files</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 text-sm px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
          {movePlan && movePlan.steps.length > 0 && (
            <>
              <button
                data-testid="copy-moveplan-link-btn"
                onClick={handleCopyLink}
                className="flex-1 text-sm px-4 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <HiCheck className="text-sm" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <HiExternalLink className="text-sm" />
                    Copy Share Link
                  </>
                )}
              </button>
              <button
                data-testid="open-moveplan-btn"
                onClick={handleOpenInNewTab}
                className="text-sm px-4 py-2.5 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <HiExternalLink className="text-sm" />
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
