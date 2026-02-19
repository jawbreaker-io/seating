import { useMemo } from 'react'
import { HiSwitchHorizontal, HiCheckCircle, HiArrowCircleRight, HiMinusCircle, HiPlusCircle } from 'react-icons/hi'
import type { MovePlanPayload } from '../shareUtils'
import { getDepartmentColor as getDefaultDeptColor } from '../data'
import { computeMovePlan } from '../moveOptimizer'
import type { MovePlan, MoveStep } from '../moveOptimizer'

interface MovePlanPageProps {
  payload: MovePlanPayload
}

function StepIcon({ step }: { step: MoveStep }) {
  if (!step.fromDeskId) {
    return <HiPlusCircle className="text-green-500 text-lg flex-shrink-0" />
  }
  if (!step.toDeskId) {
    return <HiMinusCircle className="text-red-400 text-lg flex-shrink-0" />
  }
  if (step.swapPartnerNames && step.swapPartnerNames.length > 0) {
    return <HiSwitchHorizontal className="text-amber-500 text-lg flex-shrink-0" />
  }
  return <HiArrowCircleRight className="text-blue-500 text-lg flex-shrink-0" />
}

export function MovePlanPage({ payload }: MovePlanPageProps) {
  const { originalSeating, newSeating, employees, deskNames, departmentColors } = payload

  const getDeptColor = (dept: string) => getDefaultDeptColor(dept, departmentColors)

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])

  const movePlan: MovePlan = useMemo(
    () => computeMovePlan(originalSeating, newSeating, employees, deskNames),
    [originalSeating, newSeating, employees, deskNames],
  )

  // Group steps by type for section headers
  const sections = useMemo(() => {
    const result: { title: string; icon: React.ReactNode; steps: MoveStep[] }[] = []

    const removals = movePlan.steps.filter((s) => !s.toDeskId)
    const directMoves = movePlan.steps.filter((s) => s.fromDeskId && s.toDeskId && !s.swapPartnerNames?.length)
    const swaps = movePlan.steps.filter((s) => s.fromDeskId && s.toDeskId && s.swapPartnerNames && s.swapPartnerNames.length > 0)
    const additions = movePlan.steps.filter((s) => !s.fromDeskId)

    if (removals.length > 0) {
      result.push({
        title: `Vacating Desks (${removals.length})`,
        icon: <HiMinusCircle className="text-red-400" />,
        steps: removals,
      })
    }
    if (directMoves.length > 0) {
      result.push({
        title: `Desk Moves (${directMoves.length})`,
        icon: <HiArrowCircleRight className="text-blue-500" />,
        steps: directMoves,
      })
    }
    if (swaps.length > 0) {
      result.push({
        title: `Desk Swaps (${swaps.length})`,
        icon: <HiSwitchHorizontal className="text-amber-500" />,
        steps: swaps,
      })
    }
    if (additions.length > 0) {
      result.push({
        title: `New Assignments (${additions.length})`,
        icon: <HiPlusCircle className="text-green-500" />,
        steps: additions,
      })
    }

    return result
  }, [movePlan.steps])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <HiSwitchHorizontal className="text-3xl text-indigo-500 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Desk Move Plan</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Follow the steps below in order to complete the office rearrangement.
            Each step can be executed as soon as the previous one is done.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{movePlan.summary.totalSteps}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Total Steps</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{movePlan.summary.peopleMoving}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Desk Changes</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{movePlan.summary.cyclesDetected}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Swap Cycles</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{movePlan.summary.unchanged}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Unchanged</div>
          </div>
        </div>

        {movePlan.summary.cyclesDetected > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>{movePlan.summary.cyclesDetected} swap cycle{movePlan.summary.cyclesDetected > 1 ? 's' : ''} detected.</strong>{' '}
              In a cycle, people need each other's desks. These swaps must happen
              at the same time &mdash; look for the swap partner listed on each step.
            </p>
          </div>
        )}

        {/* Step list */}
        {movePlan.steps.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {movePlan.steps.map((step) => {
                const emp = empMap.get(step.employeeId)
                return (
                  <div
                    key={`${step.step}-${step.employeeId}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {/* Step number */}
                    <span className="text-sm font-bold text-gray-400 dark:text-gray-500 w-8 text-right flex-shrink-0">
                      {step.step}
                    </span>

                    {/* Type icon */}
                    <StepIcon step={step} />

                    {/* Employee avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: emp ? getDeptColor(emp.department) : '#6b7280' }}
                    >
                      {emp?.avatar ?? '??'}
                    </div>

                    {/* Employee name */}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-800 dark:text-gray-100 truncate block">{step.employeeName}</span>
                      {step.swapPartnerNames && step.swapPartnerNames.length > 0 ? (
                        <span className="text-xs text-amber-600 dark:text-amber-400">Swap with {step.swapPartnerNames.join(', ')}</span>
                      ) : emp ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{emp.department}</span>
                      ) : null}
                    </div>

                    {/* Move description */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        step.fromDeskId
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                      }`}>
                        {step.fromDeskLabel}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-300 dark:text-gray-600">
                        <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
                      </svg>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        step.toDeskId
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400'
                          : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                      }`}>
                        {step.toDeskLabel}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <HiCheckCircle className="text-5xl text-green-400 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-200">Layouts are identical!</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">No moves are needed.</p>
          </div>
        )}

        {/* Sections breakdown (collapsible summary) */}
        {sections.length > 1 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Summary by Type</h3>
            <div className="grid gap-2">
              {sections.map((section) => (
                <div key={section.title} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3">
                  <span className="text-lg">{section.icon}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{section.title}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                    Steps {section.steps[0].step}
                    {section.steps.length > 1 && `–${section.steps[section.steps.length - 1].step}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
