import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export type Notification = {
  id: string
  recipient_id: string
  type: string
  title: string
  message: string | null
  data: any
  read: boolean
  created_at: string
  updated_at: string
}

export type NotificationsResponse = {
  notifications: Notification[]
  unread_count: number
}

export const useNotifications = (unreadOnly = false, limit = 20) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  const fetchNotifications = async (pageNum = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)

      // Get current session for auth token with retry
      let session = null
      let retryCount = 0
      const maxRetries = 2

      while (retryCount < maxRetries) {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (currentSession?.access_token) {
          session = currentSession
          break
        }
        
        if (sessionError) {
          console.warn('Session error in notifications, attempting token refresh:', sessionError)
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
          if (refreshedSession?.access_token) {
            session = refreshedSession
            break
          }
        }
        
        retryCount++
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      if (!session?.access_token) {
        console.warn('No valid session for notifications after retries')
        setError('Authentication session expired')
        return
      }

      const params = new URLSearchParams({
        limit: limit.toString(),
        page: pageNum.toString(),
        ...(unreadOnly && { unread_only: 'true' })
      })

      const response = await fetch(`/api/notifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: NotificationsResponse = await response.json()
      
      if (append) {
        setNotifications(prev => [...prev, ...data.notifications])
      } else {
        setNotifications(data.notifications)
        setPage(1)
      }
      
      setUnreadCount(data.unread_count)
      setHasMore(data.notifications.length === limit) // If we got fewer than limit, no more pages

    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    await fetchNotifications(nextPage, true)
  }

  const markAsRead = async (notificationIds?: string[], markAllRead = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification_ids: notificationIds,
          mark_all_read: markAllRead,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Update local state
      if (markAllRead) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      } else if (notificationIds) {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) ? { ...n, read: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
      }

    } catch (err) {
      console.error('Error marking notifications as read:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark notifications as read')
    }
  }

  const markAllAsRead = () => markAsRead(undefined, true)

  const markSingleAsRead = (notificationId: string) => markAsRead([notificationId])

  const markMultipleAsRead = (notificationIds: string[]) => markAsRead(notificationIds)

  // Fetch notifications on mount and when dependencies change
  useEffect(() => {
    fetchNotifications()
  }, [unreadOnly, limit])

  // Set up real-time subscription for new notifications
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const subscription = supabase
        .channel('notifications')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications',
            filter: `recipient_id=eq.${user.id}` 
          }, 
          (payload) => {
            const newNotification = payload.new as Notification
            setNotifications(prev => [newNotification, ...prev])
            setUnreadCount(prev => prev + 1)
          }
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public', 
            table: 'notifications',
            filter: `recipient_id=eq.${user.id}`
          },
          (payload) => {
            const updatedNotification = payload.new as Notification
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            )
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }

    setupSubscription()
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    error,
    hasMore,
    refetch: fetchNotifications,
    loadMore,
    markAsRead: markSingleAsRead,
    markMultipleAsRead,
    markAllAsRead,
  }
} 