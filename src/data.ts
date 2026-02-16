import type { Employee, Zone, Desk, SeatingMap } from './types'

export const UNKNOWN_DEPARTMENT = 'Unknown'

export const DEFAULT_DEPARTMENT_COLORS: Record<string, string> = {
  Engineering: '#3b82f6',
  Design: '#a855f7',
  Marketing: '#f97316',
  Sales: '#10b981',
  HR: '#ec4899',
  Finance: '#eab308',
  Product: '#06b6d4',
  Operations: '#6366f1',
  [UNKNOWN_DEPARTMENT]: '#6b7280',
}

export function getDepartmentColor(department: string, customColors?: Record<string, string>): string {
  if (customColors && customColors[department]) return customColors[department]
  return DEFAULT_DEPARTMENT_COLORS[department] ?? '#6b7280'
}

export const employees: Employee[] = [
  { id: 'e1', name: 'Alice Chen', department: 'Engineering', avatar: 'AC' },
  { id: 'e2', name: 'Bob Martinez', department: 'Engineering', avatar: 'BM' },
  { id: 'e3', name: 'Carol Wu', department: 'Design', avatar: 'CW' },
  { id: 'e4', name: 'David Kim', department: 'Marketing', avatar: 'DK' },
  { id: 'e5', name: 'Eva Singh', department: 'Sales', avatar: 'ES' },
  { id: 'e6', name: 'Frank Lopez', department: 'Engineering', avatar: 'FL' },
  { id: 'e7', name: 'Grace Patel', department: 'Design', avatar: 'GP' },
  { id: 'e8', name: 'Henry Zhao', department: 'HR', avatar: 'HZ' },
  { id: 'e9', name: 'Iris Johnson', department: 'Finance', avatar: 'IJ' },
  { id: 'e10', name: 'Jack Brown', department: 'Product', avatar: 'JB' },
  { id: 'e11', name: 'Karen Lee', department: 'Engineering', avatar: 'KL' },
  { id: 'e12', name: 'Leo Nguyen', department: 'Operations', avatar: 'LN' },
  { id: 'e13', name: 'Mia Davis', department: 'Marketing', avatar: 'MD' },
  { id: 'e14', name: 'Noah Wilson', department: 'Sales', avatar: 'NW' },
  { id: 'e15', name: 'Olivia Taylor', department: 'Engineering', avatar: 'OT' },
  { id: 'e16', name: 'Paul Anderson', department: 'Design', avatar: 'PA' },
  { id: 'e17', name: 'Quinn Thomas', department: 'Finance', avatar: 'QT' },
  { id: 'e18', name: 'Rachel Garcia', department: 'Product', avatar: 'RG' },
  { id: 'e19', name: 'Sam Robinson', department: 'HR', avatar: 'SR' },
  { id: 'e20', name: 'Tina Clark', department: 'Operations', avatar: 'TC' },
]

export const zones: Zone[] = [
  { id: 'z1', name: 'Engineering Bay', color: '#dbeafe', rows: 3, cols: 4 },
  { id: 'z2', name: 'Design Studio', color: '#f3e8ff', rows: 2, cols: 3 },
  { id: 'z3', name: 'Business Wing', color: '#dcfce7', rows: 2, cols: 4 },
]

export function generateDesks(zones: Zone[]): Desk[] {
  const desks: Desk[] = []
  for (const zone of zones) {
    for (let r = 0; r < zone.rows; r++) {
      for (let c = 0; c < zone.cols; c++) {
        desks.push({
          id: `${zone.id}-d${r * zone.cols + c}`,
          row: r,
          col: c,
          zone: zone.id,
        })
      }
    }
  }
  return desks
}

export const desks = generateDesks(zones)

export const defaultSeating: SeatingMap = {
  'z1-d0': 'e1',
  'z1-d1': 'e2',
  'z1-d2': 'e6',
  'z1-d3': 'e11',
  'z1-d4': 'e15',
  'z2-d0': 'e3',
  'z2-d1': 'e7',
  'z2-d2': 'e16',
  'z3-d0': 'e4',
  'z3-d1': 'e5',
  'z3-d2': 'e8',
  'z3-d3': 'e9',
  'z3-d4': 'e10',
  'z3-d5': 'e12',
  'z3-d6': 'e13',
  'z3-d7': 'e14',
}
