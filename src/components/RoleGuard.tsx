'use client'

import { useUser } from '@/app/UserProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface RoleGuardProps {
  allowedRoles: string[]
  redirectTo?: string
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, redirectTo = '/mobile-app-download', children }: RoleGuardProps) {
  const userContext = useUser()
  const router = useRouter()

  useEffect(() => {
    if (userContext && userContext.user && userContext.profile) {
      const userRole = userContext.profile.role
      
      if (!allowedRoles.includes(userRole)) {
        router.push(redirectTo)
        return
      }
    }
  }, [userContext, allowedRoles, redirectTo, router])

  // Don't render children if user role is not allowed
  if (userContext?.profile && !allowedRoles.includes(userContext.profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6551] mx-auto"></div>
          <p className="mt-2 text-gray-600 font-inter">Redirecting...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Convenience components for specific roles
export function AdminOnly({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['admin']}>
      {children}
    </RoleGuard>
  )
}

export function EmployeeOnly({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['employee']} redirectTo="/dashboard">
      {children}
    </RoleGuard>
  )
} 