'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppStore {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Period filter (persisted)
  selectedYear: number
  selectedMonth: number
  setSelectedPeriod: (year: number, month: number) => void

  // Branch filter (for region users)
  selectedBranchId: string | null
  setSelectedBranch: (id: string | null) => void

  // Action view mode
  actionViewMode: 'kanban' | 'table'
  setActionViewMode: (mode: 'kanban' | 'table') => void

  // KM filter
  kmFilterStatus: string
  setKmFilterStatus: (status: string) => void
}

const now = new Date()

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      selectedYear: now.getFullYear(),
      selectedMonth: now.getMonth() + 1,
      setSelectedPeriod: (year, month) => set({ selectedYear: year, selectedMonth: month }),

      selectedBranchId: null,
      setSelectedBranch: (id) => set({ selectedBranchId: id }),

      actionViewMode: 'kanban',
      setActionViewMode: (mode) => set({ actionViewMode: mode }),

      kmFilterStatus: 'all',
      setKmFilterStatus: (status) => set({ kmFilterStatus: status }),
    }),
    { name: 'nrw-tracker-store' }
  )
)
