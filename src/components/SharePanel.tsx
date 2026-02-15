import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { HiShare, HiLink, HiDownload, HiUpload } from 'react-icons/hi'
import type { Desk, Zone, SeatingMap, DeskNameMap, UnavailableDeskMap } from '../types'
import { buildShareUrl, exportSeatingJson, importSeatingJson } from '../shareUtils'

interface SharePanelProps {
  seating: SeatingMap
  desks: Desk[]
  zones: Zone[]
  deskNames: DeskNameMap
  unavailableDesks: UnavailableDeskMap
  onImport: (seating: SeatingMap) => void
}

export function SharePanel({ seating, desks, zones, deskNames, unavailableDesks, onImport }: SharePanelProps) {
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
    const url = buildShareUrl({ zones, seating, deskNames, unavailableDesks })
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
    exportSeatingJson(seating)
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
      // user cancelled or invalid file — ignore
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        data-testid="share-btn"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
      >
        <HiShare className="text-sm" />
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
            className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-50"
          >
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Share Arrangement
            </p>

            <button
              data-testid="copy-link-btn"
              onClick={handleCopyLink}
              className="w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <HiLink className="text-blue-500 text-base flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-gray-700">
                  {copied ? 'Link copied!' : 'Copy shareable link'}
                </span>
                <p className="text-[10px] text-gray-400">
                  Anyone with the link can view this arrangement
                </p>
              </div>
            </button>

            <hr className="my-2 border-gray-100" />

            <button
              data-testid="export-btn"
              onClick={handleExport}
              className="w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <HiDownload className="text-green-500 text-base flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-gray-700">Export as JSON</span>
                <p className="text-[10px] text-gray-400">
                  Download arrangement file
                </p>
              </div>
            </button>

            <button
              data-testid="import-btn"
              onClick={handleImport}
              className="w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <HiUpload className="text-purple-500 text-base flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-gray-700">Import from JSON</span>
                <p className="text-[10px] text-gray-400">
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
