'use client'

import { useAuth } from './useAuth'

export function useRole() {
  const { profile } = useAuth()

  return {
    role: profile?.role ?? null,
    isRegionAdmin: profile?.role === 'region_admin',
    isRegionViewer: profile?.role === 'region_viewer',
    isRegion: ['region_admin', 'region_viewer'].includes(profile?.role ?? ''),
    isBranchManager: profile?.role === 'branch_manager',
    isBranchStaff: profile?.role === 'branch_staff',
    isBranch: ['branch_manager', 'branch_staff'].includes(profile?.role ?? ''),
    canWrite: ['region_admin', 'branch_manager', 'branch_staff'].includes(profile?.role ?? ''),
    canApprove: profile?.role === 'region_admin',
    canSetupMeeting: profile?.role === 'region_admin',
    branchId: profile?.branch_id ?? null,
    branchCode: profile?.branches?.code ?? null,
    branchName: profile?.branches?.name_th ?? null,
  }
}
