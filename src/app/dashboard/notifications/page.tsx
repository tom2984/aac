"use client"

import React, { useState } from 'react'
import { useUser } from '@/app/UserProvider'
import { useNotifications, Notification } from '@/hooks/useNotifications'

export default function NotificationsPage() {
  const userContext = useUser()
  const { 
    notifications, 
    unreadCount, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    loadMore,
    markAsRead, 
    markMultipleAsRead, 
    markAllAsRead 
  } = useNotifications()
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  if (!userContext || userContext.loading) {
    return <div>Loading...</div>
  }

  if (!userContext.user) {
    return <div className="text-red-600 mb-4 text-sm font-inter">Please log in to view notifications.</div>
  }

  // Filter notifications based on search term
  const filteredNotifications = notifications.filter(notification => {
    // If no search term, show all notifications
    if (!searchTerm || searchTerm.trim().length === 0) {
      return true
    }
    
    const searchTermLower = searchTerm.toLowerCase().trim()
    const title = notification.title || ''
    const message = notification.message || ''
    
    const titleMatch = title.toLowerCase().includes(searchTermLower)
    const messageMatch = message.toLowerCase().includes(searchTermLower)
    
    // Debug logging - remove this after testing
    console.log('Search term:', `"${searchTerm}"`)
    console.log('Notification:', { 
      id: notification.id,
      title: title, 
      message: message,
      titleMatch,
      messageMatch,
      result: titleMatch || messageMatch
    })
    
    return titleMatch || messageMatch
  })

  // Debug logging - remove this after testing
  if (searchTerm && searchTerm.length > 0) {
    console.log(`Total notifications: ${notifications.length}, Filtered: ${filteredNotifications.length}`)
  }

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at).toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short' 
    }).replace(/\./g, '') // Remove dots to match "23 Jule" format
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(notification)
    return groups
  }, {} as Record<string, Notification[]>)

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    )
  }

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id))
    }
  }

  const handleMarkSelectedAsRead = async () => {
    if (selectedNotifications.length > 0) {
      await markMultipleAsRead(selectedNotifications)
      setSelectedNotifications([])
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'form_submitted':
        return '📝'
      case 'invite_accepted':
        return '✅'
      default:
        return '📬'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'form_submitted':
        return 'border-blue-500'
      case 'invite_accepted':
        return 'border-green-500'
      default:
        return 'border-gray-500'
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading notifications: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold font-inter text-[#272937]">Notifications</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => {
              console.log('Search input changed:', e.target.value)
              setSearchTerm(e.target.value)
            }}
            className="w-full sm:w-[280px] h-[40px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#272937] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-transparent"
          />
          {searchTerm ? (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
              title="Clear search"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          ) : (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-4 sm:p-6 lg:p-8">
          {/* Bulk Actions Bar */}
          {selectedNotifications.length > 0 && (
            <div className="flex items-center justify-between mb-6 p-4 bg-[#FFF6F4] border border-[#FFE5E1] rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-medium text-[#272937] font-inter">
                  {selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleMarkSelectedAsRead}
                  className="text-[13px] font-medium text-[#FF6551] hover:text-[#E55A4A] transition-colors font-inter"
                >
                  Mark as read
                </button>
                <button
                  onClick={() => setSelectedNotifications([])}
                  className="text-[13px] font-medium text-[#6B7280] hover:text-[#374151] transition-colors font-inter"
                >
                  Clear selection
                </button>
              </div>
            </div>
          )}

          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2 font-inter">
                {searchTerm ? 'No matching notifications' : 'No notifications yet'}
              </h3>
              <p className="text-gray-500 font-inter">
                {searchTerm ? 'Try adjusting your search terms.' : 'New notifications will appear here.'}
              </p>
            </div>
          ) : (
            <div>
              {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
                <div key={date} className="mb-8">
                  <div className="text-sm font-medium text-[#6B7280] font-inter mb-4">{date}</div>
                  <div className="space-y-1">
                    {dateNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-4 px-4 group hover:bg-[#F9FAFB] rounded-lg transition-colors"
                      >
                        {/* Top row for mobile: checkbox + content + menu */}
                        <div className="flex items-start gap-3 sm:flex-1">
                          {/* Circular Checkbox */}
                          <div className="flex items-center justify-center w-6 h-6 mt-0.5 sm:mt-0">
                            <input
                              type="checkbox"
                              checked={selectedNotifications.includes(notification.id)}
                              onChange={() => handleSelectNotification(notification.id)}
                              className="w-5 h-5 rounded-full border-2 border-[#E5E7EB] text-[#FF6551] focus:ring-0 focus:ring-offset-0 checked:bg-[#FF6551] checked:border-[#FF6551]"
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="font-inter text-[15px] font-medium text-[#111827] leading-[22px] mb-1">
                              {notification.title}
                            </div>
                            {notification.message && (
                              <div className="text-[13px] text-[#6B7280] font-inter leading-[18px]">
                                {notification.message}
                              </div>
                            )}
                          </div>

                          {/* Three dots menu - always visible */}
                          <div className="relative sm:hidden">
                            <button 
                              className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#374151] hover:bg-[#F3F4F6] rounded-full transition-colors"
                              onClick={() => markAsRead(notification.id)}
                              title="Mark as read"
                            >
                              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Bottom row for mobile: actions + time */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 ml-9 sm:ml-0">
                          <div className="flex items-center gap-4">
                            {notification.data?.form_id && (
                              <button 
                                onClick={() => {
                                  window.location.href = `/dashboard/forms?viewResponses=${notification.data.form_id}`
                                }}
                                className="text-[#FF6551] text-[13px] font-inter font-medium hover:text-[#E55A4A] transition-colors whitespace-nowrap"
                              >
                                View Form
                              </button>
                            )}
                            
                            {/* Time */}
                            <div className="text-[12px] text-[#9CA3AF] font-inter whitespace-nowrap">
                              {formatTime(notification.created_at)}
                            </div>
                          </div>

                          {/* Three dots menu - desktop only */}
                          <div className="relative hidden sm:block">
                            <button 
                              className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#374151] hover:bg-[#F3F4F6] rounded-full transition-colors"
                              onClick={() => markAsRead(notification.id)}
                              title="Mark as read"
                            >
                              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!searchTerm && filteredNotifications.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col items-center gap-4">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                    <span className="text-sm font-inter">Loading more notifications...</span>
                  </div>
                )}
                
                {hasMore && !loadingMore && (
                  <button
                    onClick={loadMore}
                    className="flex items-center gap-2 px-6 py-3 bg-[#FF6551] text-white font-medium rounded-lg hover:bg-[#E55A4A] transition-colors font-inter"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    Load More Notifications
                  </button>
                )}
                
                {!hasMore && notifications.length > 0 && (
                  <div className="text-center text-gray-500">
                    <p className="text-sm font-inter">You've reached the end of your notifications</p>
                    <p className="text-xs font-inter text-gray-400 mt-1">
                      Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 