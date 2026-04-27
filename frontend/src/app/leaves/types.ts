export interface LeaveRequest {
  id: string
  userId: string
  startDate: string
  endDate: string
  bsStartYear: number
  bsStartMonth: number
  bsStartDay: number
  bsEndYear: number
  bsEndMonth: number
  bsEndDay: number
  reason: string
  type: string
  status: string
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string
  durationDays: number
  rejectionMessage?: string | null
  user?: {
    id: string
    firstName: string
    lastName: string
    employeeId: string
    email: string
  }
  approver?: {
    firstName: string
    lastName: string
  } | null
}

export interface LeaveBalance {
  id: string
  membershipId: string
  bsYear: number
  annualEntitlement: number
  sickEntitlement: number
  casualEntitlement: number
  annualCarriedOver: number
  sickCarriedOver: number
  casualCarriedOver: number
  annualUsed: number
  sickUsed: number
  casualUsed: number
  annualAvailable: number
  sickAvailable: number
  casualAvailable: number
  lastAdjustedBy: string | null
  lastAdjustedAt: string | null
  adjustmentNote: string | null
  membership: {
    employeeId: string | null
    user: { firstName: string; lastName: string }
  }
}
