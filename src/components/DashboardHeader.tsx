import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

type User = {
  name: string;
  avatar: string;
};

const getBreadcrumbs = (pathname: string) => {
  // Remove query/hash, split path, filter empty
  const parts = pathname.split('?')[0].split('#')[0].split('/').filter(Boolean)
  // Only show breadcrumbs for /dashboard and below
  const crumbs = []
  if (parts[0] === 'dashboard') {
    crumbs.push({ label: 'Dashboard', href: '/dashboard' })
    if (parts[1]) {
      crumbs.push({ label: capitalize(parts[1]), href: `/dashboard/${parts[1]}` })
    }
    if (parts[2]) {
      crumbs.push({ label: formatCrumb(parts[2]), href: null })
    }
  }
  return crumbs
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
const formatCrumb = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'form_submitted':
      return (
        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-2">
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M8 2a6 6 0 100 12A6 6 0 008 2zM7 9V7h2v2H7zm0-4V3h2v2H7z" fill="#2563EB"/>
          </svg>
        </span>
      )
    case 'invite_accepted':
      return (
        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-green-100 text-green-600 mr-2">
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill="#16A34A"/>
          </svg>
        </span>
      )
    default:
      return (
        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 mr-2">
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="8" fill="#F3F4F6"/>
            <path d="M8 5.5v.75m0 2.25v2" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="11.5" r=".5" fill="#6B7280"/>
          </svg>
        </span>
      )
  }
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}h ago`
  } else {
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }
}

const DashboardHeader: React.FC<{ user: User; onLogout?: () => void; onMenuClick?: () => void }> = ({ user, onLogout, onMenuClick }) => {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)
  const [open, setOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  
  // Get notifications data
  const { notifications, unreadCount, loading, markAsRead } = useNotifications(false, 5) // Show 5 most recent

  // Close on outside click or ESC
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  // Focus trap: focus first link when opened
  useEffect(() => {
    if (open && panelRef.current) {
      const firstLink = panelRef.current.querySelector('a, button, [tabindex="0"]') as HTMLElement
      firstLink?.focus()
    }
  }, [open])

  // User menu close on outside click or ESC
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node) &&
        userRef.current &&
        !userRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [userMenuOpen]);

  return (
    <header className="sticky top-0 z-30 w-full bg-white h-14 flex items-center justify-between px-4 sm:px-8 border-b border-[#E5E7EB]">
      <div className="flex items-center gap-4">
        {/* Mobile hamburger menu */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Open sidebar"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[15px] font-inter" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, idx) => (
          <span key={crumb.label} className="flex items-center gap-2">
            {crumb.href && idx !== breadcrumbs.length - 1 ? (
              <Link href={crumb.href} className="text-gray-900 font-medium hover:underline focus:underline outline-none">{crumb.label}</Link>
            ) : (
              <span className="text-gray-400 font-normal cursor-default select-none">{crumb.label}</span>
            )}
            {idx < breadcrumbs.length - 1 && <span className="text-gray-300">&gt;</span>}
          </span>
        ))}
      </nav>
      </div>
      
      {/* Right: Notification bell and user */}
      <div className="flex items-center gap-6 relative">
        <button
          ref={bellRef}
          className="relative p-2 rounded-full hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          aria-label="Open notifications"
          aria-haspopup="true"
          aria-expanded={open}
          tabIndex={0}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(v => !v) }}
        >
          {/* Bell icon (Lucide or SVG) */}
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#FF6551" strokeWidth="1.5">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {/* Unread notification badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {/* Floating Notification Panel */}
        {open && (
          <div
            ref={panelRef}
            className="absolute right-0 top-full mt-2 min-w-[320px] w-[400px] max-w-[90vw] max-h-[400px] overflow-y-auto bg-white rounded-[10px] shadow-lg border border-[#E5E7EB] p-4 z-40 flex flex-col custom-scrollbar"
            tabIndex={-1}
            role="dialog"
            aria-label="Notifications"
          >
            <div className="text-[13px] text-gray-400 font-inter mb-2 ml-1">
              Notifications
              {unreadCount > 0 && <span className="ml-1">({unreadCount} unread)</span>}
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <div className="py-4">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-4 text-center text-gray-500 text-sm">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`flex items-start gap-3 py-4 first:pt-0 last:pb-0 ${!notification.read ? 'bg-blue-50' : ''}`}
                  >
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1">
                      <div className={`font-semibold text-[16px] font-inter text-[#272937] flex items-center`}>
                        {notification.title}
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full ml-2"></span>
                        )}
                      </div>
                      {notification.message && (
                        <div className="text-[14px] text-[#27293799] font-inter">
                          {notification.message}
                        </div>
                      )}
                      <div className="text-[12px] text-gray-400 font-inter mt-1">
                        {formatTime(notification.created_at)}
                      </div>
                      {(notification.data && typeof notification.data === 'object' && notification.data.form_id) && (
                        <Link 
                          href={`/dashboard/forms?viewResponses=${notification.data.form_id}`}
                          className="text-[15px] font-inter text-[#FF6551] hover:text-[#E55A4A] hover:underline focus:underline outline-none mt-1 inline-block" 
                          tabIndex={0}
                          onClick={() => {
                            setOpen(false)
                            if (!notification.read) {
                              markAsRead(notification.id)
                            }
                          }}
                        >
                          View Form
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <div className="pt-3 mt-3 border-t border-[#E5E7EB]">
                <Link 
                  href="/dashboard/notifications"
                  className="block w-full text-center text-[15px] font-inter text-blue-600 hover:underline focus:underline outline-none"
                  onClick={() => setOpen(false)}
                >
                  View all notifications
                </Link>
              </div>
            )}
          </div>
        )}
        {/* User avatar/name and dropdown */}
        <div className="flex items-center gap-2 relative" ref={userRef}>
          <button
            className="flex items-center gap-2 focus:outline-none"
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
            tabIndex={0}
            onClick={() => setUserMenuOpen(v => !v)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setUserMenuOpen(v => !v) }}
          >
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-full object-cover flex-shrink-0" 
            />
            <span className="text-[15px] text-gray-900 font-inter font-medium hidden sm:block truncate">{user.name}</span>
          </button>
          {userMenuOpen && (
            <div
              ref={userMenuRef}
              className="absolute right-0 top-full mt-2 min-w-[160px] bg-white rounded-[10px] shadow-lg border border-[#E5E7EB] p-2 z-40 flex flex-col"
              tabIndex={-1}
              role="menu"
              aria-label="User menu"
            >
              <button
                className="w-full text-left px-4 py-2 text-[15px] font-inter text-gray-900 hover:bg-gray-100 rounded focus:outline-none"
                onClick={onLogout}
                tabIndex={0}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader 