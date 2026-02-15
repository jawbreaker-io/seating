export interface Employee {
  id: string
  name: string
  department: string
  avatar: string // initials-based color
}

export interface Desk {
  id: string
  row: number
  col: number
  zone: string
}

export interface Zone {
  id: string
  name: string
  color: string
  rows: number
  cols: number
}

export type SeatingMap = Record<string, string | null> // deskId -> employeeId | null

export type DeskNameMap = Record<string, string> // deskId -> custom name
export type UnavailableDeskMap = Record<string, boolean> // deskId -> true if unavailable

export interface DragItem {
  type: 'employee'
  employeeId: string
  sourceDeskId: string | null // null if from sidebar (unassigned)
}
