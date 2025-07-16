import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const menu = [
  { label: 'Dashboard', href: '/dashboard', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ) },
  { label: 'Notifications', href: '/dashboard/notifications', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ) },
  { label: 'Forms', href: '/dashboard/forms', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ) },
  { label: 'Analytics', href: '/dashboard/analytics', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 17a2 2 0 104 0 2 2 0 00-4 0zm-7 4a2 2 0 104 0 2 2 0 00-4 0zm14-2a2 2 0 100-4 2 2 0 000 4zm-7-2a2 2 0 100-4 2 2 0 000 4zm-7-2a2 2 0 100-4 2 2 0 000 4zm14-2a2 2 0 100-4 2 2 0 000 4zm-7-2a2 2 0 100-4 2 2 0 000 4zm-7-2a2 2 0 100-4 2 2 0 000 4z" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ) },
  { label: 'Settings', href: '/dashboard/settings', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ) },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when mobile sidebar is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        bg-white flex flex-col border-r border-gray-100 gap-4 z-50
        
        /* Desktop: Fixed sidebar */
        lg:relative lg:translate-x-0 lg:w-64 lg:min-h-screen
        
        /* Mobile: Sliding overlay sidebar */
        fixed top-0 left-0 h-full w-64 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex justify-between items-center gap-2 px-6 py-8">
          <Link href="/dashboard" className="cursor-pointer">
            <img src="/logo2.svg" alt="Logo" className="h-8 w-auto hover:opacity-80 transition-opacity" />
          </Link>
          
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="flex-1 px-2 space-y-2">
          <span className="text-[12px] font-inter font-normal text-[#27293759] px-4"> Main menu </span>
          {menu.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  // Close mobile sidebar on navigation
                  if (onClose && window.innerWidth < 1024) {
                    onClose()
                  }
                }}
                className={`flex items-center gap-[10px] pl-4 py-[10px] rounded-lg transition-colors cursor-pointer font-inter text-[16px] ${
                  isActive 
                    ? 'bg-[#FFE5E0] text-[#FF6551] font-semibold' 
                    : 'text-[#272937] font-normal hover:bg-gray-100'
                }`}
                tabIndex={0}
                aria-label={item.label}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
} 