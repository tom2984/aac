'use client'

import { usePathname } from 'next/navigation'
import {
  Home,
  Bell,
  ClipboardList,
  PieChart,
  Settings as SettingsIcon,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'
import { useUser } from '@/app/UserProvider'
import { AdminAndManagerOnly } from '@/components/RoleGuard'

type MenuItem = {
  name: string
  href: string
  icon: React.ReactElement
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const userContext = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    if (userContext?.logout) {
      await userContext.logout()
    }
  }

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  if (!userContext || !userContext.user) {
    return <div className="text-red-600 mb-4 text-sm font-inter">Loading user...</div>;
  }

  const menu: MenuItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: <Home /> },
    { name: 'Notifications', href: '/dashboard/notifications', icon: <Bell /> },
    { name: 'Forms', href: '/dashboard/forms', icon: <ClipboardList /> },
    { name: 'Analytics', href: '/dashboard/analytics', icon: <PieChart /> },
    { name: 'Settings', href: '/dashboard/settings', icon: <SettingsIcon /> },
  ]

  return (
    <AdminAndManagerOnly>
      <div className="flex min-h-screen bg-[#F7F7F8]">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        <div className="flex-1 flex flex-col min-w-0">
          {userContext.user && <DashboardHeader 
            user={{
              name: userContext.profile?.first_name && userContext.profile?.last_name 
                ? `${userContext.profile.first_name} ${userContext.profile.last_name}`
                : userContext.user.email,
              avatar: userContext.profile?.avatar_url || '/logo.svg'
            }} 
            onLogout={handleLogout}
            onMenuClick={() => setSidebarOpen(true)}
          />}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </AdminAndManagerOnly>
  )
}

