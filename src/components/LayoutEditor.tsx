import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { HiPlus, HiTrash, HiX } from 'react-icons/hi'
import type { Zone } from '../types'

const ZONE_COLORS = [
  '#dbeafe',
  '#f3e8ff',
  '#dcfce7',
  '#fef3c7',
  '#ffe4e6',
  '#e0f2fe',
  '#ecfdf5',
  '#fdf2f8',
  '#e0e7ff',
  '#fefce8',
]

interface LayoutEditorProps {
  zones: Zone[]
  onAddZone: (name: string, color: string, rows: number, cols: number) => void
  onUpdateZone: (id: string, updates: Partial<Omit<Zone, 'id'>>) => void
  onRemoveZone: (id: string) => void
  onResetLayout: () => void
  onClose: () => void
}

export function LayoutEditor({
  zones,
  onAddZone,
  onUpdateZone,
  onRemoveZone,
  onResetLayout,
  onClose,
}: LayoutEditorProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleAddZone = () => {
    const usedColors = new Set(zones.map((z) => z.color))
    const nextColor =
      ZONE_COLORS.find((c) => !usedColors.has(c)) ?? ZONE_COLORS[0]
    onAddZone(`Zone ${zones.length + 1}`, nextColor, 2, 3)
  }

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      onRemoveZone(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
    }
  }

  return (
    <motion.div
      data-testid="layout-editor-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        data-testid="layout-editor"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-800">
            Edit Office Layout
          </h2>
          <button
            data-testid="layout-editor-close"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <HiX className="text-gray-500 text-lg" />
          </button>
        </div>

        {/* Zone list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <AnimatePresence mode="popLayout">
            {zones.map((zone) => (
              <motion.div
                key={zone.id}
                data-testid={`layout-zone-${zone.id}`}
                className="rounded-xl border border-gray-200 p-4"
                style={{ backgroundColor: zone.color + '40' }}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    {/* Zone name */}
                    <input
                      data-testid={`zone-name-${zone.id}`}
                      type="text"
                      value={zone.name}
                      onChange={(e) =>
                        onUpdateZone(zone.id, { name: e.target.value })
                      }
                      className="w-full text-sm font-semibold bg-white/70 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />

                    {/* Color picker */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 mr-1">
                        Color
                      </span>
                      {ZONE_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => onUpdateZone(zone.id, { color })}
                          className={`w-5 h-5 rounded-full border-2 transition-transform ${
                            zone.color === color
                              ? 'border-gray-600 scale-125'
                              : 'border-transparent hover:scale-110'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

                    {/* Rows and cols */}
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">Rows</span>
                        <input
                          data-testid={`zone-rows-${zone.id}`}
                          type="number"
                          min={1}
                          max={10}
                          value={zone.rows}
                          onChange={(e) =>
                            onUpdateZone(zone.id, {
                              rows: Math.max(
                                1,
                                Math.min(10, parseInt(e.target.value) || 1),
                              ),
                            })
                          }
                          className="w-14 text-sm bg-white/70 border border-gray-200 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                      </label>
                      <label className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">Cols</span>
                        <input
                          data-testid={`zone-cols-${zone.id}`}
                          type="number"
                          min={1}
                          max={10}
                          value={zone.cols}
                          onChange={(e) =>
                            onUpdateZone(zone.id, {
                              cols: Math.max(
                                1,
                                Math.min(10, parseInt(e.target.value) || 1),
                              ),
                            })
                          }
                          className="w-14 text-sm bg-white/70 border border-gray-200 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                      </label>
                      <span className="text-[10px] text-gray-400 self-center">
                        {zone.rows * zone.cols} desks
                      </span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    data-testid={`zone-delete-${zone.id}`}
                    onClick={() => handleDelete(zone.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      confirmDeleteId === zone.id
                        ? 'bg-red-500 text-white'
                        : 'hover:bg-red-50 text-red-400 hover:text-red-600'
                    }`}
                    title={
                      confirmDeleteId === zone.id
                        ? 'Click again to confirm'
                        : 'Delete zone'
                    }
                  >
                    <HiTrash className="text-sm" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {zones.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No zones yet. Add one to get started.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-2">
          <button
            data-testid="add-zone-btn"
            onClick={handleAddZone}
            className="flex items-center gap-1.5 text-xs px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
          >
            <HiPlus className="text-sm" />
            Add Zone
          </button>
          <div className="flex-1" />
          <button
            data-testid="reset-layout-btn"
            onClick={onResetLayout}
            className="text-xs px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Reset Default
          </button>
          <button
            data-testid="layout-done-btn"
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
