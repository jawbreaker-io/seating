import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { HiShare, HiLink, HiDownload, HiUpload } from 'react-icons/hi'
import { HiDocumentText } from 'react-icons/hi'
import type { Desk, Employee, Zone, SeatingMap, DeskNameMap, UnavailableDeskMap, PinnedDeskMap } from '../types'
import { buildShareUrl, exportSeatingJson, exportSeatingPdf, importSeatingJson } from '../shareUtils'
import type { SharePayload } from '../shareUtils'

interface SharePanelProps {
  seating: SeatingMap
  zones: Zone[]
  desks: Desk[]
  deskNames: DeskNameMap
  unavailableDesks: UnavailableDeskMap
  pinnedDesks: PinnedDeskMap
  employees: Employee[]
  departmentColors: Record<string, string>
  onImport: (payload: SharePayload) => void
}

export function SharePanel({ seating, zones, desks, deskNames, unavailableDesks, pinnedDesks, employees, departmentColors, onImport }: SharePanelProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleCopyLink = async () => {
    const url = buildShareUrl({ zones, seating, deskNames, unavailableDesks, pinnedDesks, employees, departmentColors })
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback for denied permission or missing API
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
  }

  const handleExport = () => {
    exportSeatingJson({ zones, seating, deskNames, unavailableDesks, pinnedDesks, employees, departmentColors })
  }

  const handleExportPdf = () => {
    exportSeatingPdf({ seating, zones, desks, deskNames, unavailableDesks, employees, departmentColors })
  }

  const handleImport = async () => {
    try {
      const imported = await importSeatingJson(desks)
      const confirmed = window.confirm(
        'This will replace your current arrangement. Continue?',
      )
      if (!confirmed) return
      onImport(imported)
      setOpen(false)
    } catch {
      // user cancelled or invalid file -- ignore
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        data-testid="share-btn"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 text-sm px-5 py-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
      >
        <HiShare className="text-base" />
        Share
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            data-testid="share-panel"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-50"
          >
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Share Arrangement
            </p>

            <button
              data-testid="copy-link-btn"
              onClick={handleCopyLink}
              className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <HiLink className="text-blue-500 text-lg flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-gray-700">
                  {copied ? 'Link copied!' : 'Copy shareable link'}
                </span>
                <p className="text-xs text-gray-400">
                  Anyone with the link can view this arrangement
                </p>
              </div>
            </button>

            <hr className="my-2 border-gray-100" />

            <button
              data-testid="export-btn"
              onClick={handleExport}
              className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <HiDownload className="text-green-500 text-lg flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-gray-700">Export as JSON</span>
                <p className="text-xs text-gray-400">
                  Download arrangement file
                </p>
              </div>
            </button>

            <button
              data-testid="export-pdf-btn"
              onClick={handleExportPdf}
              className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <HiDocumentText className="text-red-500 text-lg flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-gray-700">Export as PDF</span>
                <p className="text-xs text-gray-400">
                  Download printable floor plan
                </p>
              </div>
            </button>

            <hr className="my-2 border-gray-100" />

            <button
              data-testid="import-btn"
              onClick={handleImport}
              className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <HiUpload className="text-purple-500 text-lg flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-gray-700">Import from JSON</span>
                <p className="text-xs text-gray-400">
                  Load a shared arrangement file
                </p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
