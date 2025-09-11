'use client'
import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const UserContext = createContext<{
  user: any;
  profile: any;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
} | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const initialSessionProcessed = useRef(false)
  const lastProcessedUserId = useRef<string | null>(null)

  const refreshProfile = async () => {
    if (!user) return
    
    try {
      console.log('UserProvider: Refreshing profile for user:', user.id)
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileData && !profileError) {
        console.log('UserProvider: Profile refreshed:', profileData)
        setProfile(profileData)
      } else {
        console.error('UserProvider: Profile refresh failed:', profileError)
        
        // If profile refresh fails, try to refresh the session
        console.log('UserProvider: Attempting session refresh due to profile error...')
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshedSession && !refreshError) {
          console.log('UserProvider: Session refreshed successfully')
          setUser(refreshedSession.user)
          // Retry profile fetch with refreshed session
          const { data: retryProfileData, error: retryProfileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', refreshedSession.user.id)
            .single()
            
          if (retryProfileData && !retryProfileError) {
            console.log('UserProvider: Profile loaded after session refresh')
            setProfile(retryProfileData)
          }
        }
      }
    } catch (error) {
      console.error('UserProvider: Profile refresh exception:', error)
    }
  }

  const logout = async () => {
    try {
      console.log('UserProvider: Logging out...')
      
      // Force clear ALL session data
      if (typeof window !== 'undefined') {
        // Clear all Supabase-related localStorage items
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key)
          }
        })
        
        // Clear all sessionStorage
        sessionStorage.clear()
        
        // Clear any cookies
        if (document.cookie) {
          document.cookie.split(";").forEach(c => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
          })
        }
        
        console.log('UserProvider: Cleared all local storage and session data')
      }
      
      // Sign out from Supabase with scope 'global' to clear all sessions
      await supabase.auth.signOut({ scope: 'global' })
      console.log('UserProvider: Signed out from Supabase')

      // Clear local state immediately
      setUser(null)
      setProfile(null)
      setLoading(false)
      
      // Use window.location.replace instead of href for complete refresh
      console.log('UserProvider: Redirecting to home page...')
      window.location.replace('/')
      
    } catch (error) {
      console.error('UserProvider: Error during logout:', error)
      
      // FORCE logout - nuclear option
      console.log('UserProvider: Force logout - clearing everything')
      
      if (typeof window !== 'undefined') {
        // Nuclear option - clear everything
        localStorage.clear()
        sessionStorage.clear()
        
        // Clear cookies more aggressively
        if (document.cookie) {
          document.cookie.split(";").forEach(c => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=" + window.location.hostname)
          })
        }
      }
      
      // Clear state
      setUser(null)
      setProfile(null)
      setLoading(false)
      
      // Force complete page reload and redirect
      window.location.replace('/')
    }
  }

  // Manual force logout for emergencies (can be called from browser console)
  const forceLogout = () => {
    console.log('🚨 FORCE LOGOUT INITIATED')
    
    if (typeof window !== 'undefined') {
      // Nuclear option - clear everything
      localStorage.clear()
      sessionStorage.clear()
      
      // Clear all cookies
      if (document.cookie) {
        document.cookie.split(";").forEach(c => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=" + window.location.hostname)
        })
      }
      
      // Make it globally accessible for emergency use
      (window as any).forceLogout = forceLogout
      console.log('🚨 Emergency logout available: window.forceLogout()')
      
      // Force complete page reload
      window.location.replace('/')
    }
  }

  // Simplified session refresh for manual use only
  const refreshSession = async () => {
    try {
      console.log('UserProvider: Manual session refresh requested')
      
      // First try to refresh the session token
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshedSession && refreshedSession.user) {
        console.log('UserProvider: Session refreshed successfully')
        setUser(refreshedSession.user)
        return refreshedSession
      }
      
      // If refresh failed, try to get current session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (session && session.user) {
        console.log('UserProvider: Current session is valid')
        setUser(session.user)
        return session
      } else if (error || refreshError) {
        console.error('UserProvider: Session refresh failed:', error || refreshError)
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    } catch (error) {
      console.error('UserProvider: Session refresh exception:', error)
      setUser(null)
      setProfile(null)
      setLoading(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    console.log('UserProvider: Component mounted, starting auth initialization')
    
    // Make force logout available globally for emergencies
    if (typeof window !== 'undefined') {
      (window as any).forceLogout = forceLogout
    }

    let authListener: any = null
    let authStateChangeTimeout: NodeJS.Timeout | null = null
    
    // Handle browser tab visibility changes to prevent unnecessary re-authentication
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && lastProcessedUserId.current) {
        console.log('UserProvider: Tab became visible, user already authenticated - no action needed')
      }
    }
    
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    const handleAuthUser = async (authUser: any, source: string) => {
      if (!mountedRef.current) return

      console.log(`UserProvider: Processing auth user from ${source}:`, authUser?.email || 'none')
      
      if (authUser) {
        // Set user immediately
        setUser(authUser)
        
        // Track this user as processed to prevent duplicate events
        lastProcessedUserId.current = authUser.id
        
        // Create basic profile with email
        const basicProfile = { 
          id: authUser.id,
          email: authUser.email,
          role: 'admin', 
          status: 'active',
          first_name: '',
          last_name: '',
          avatar_url: ''
        }
        
        setProfile(basicProfile)
        // Fetch real profile to replace basic profile
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single()
          
          if (profileError) {
            console.error('UserProvider: Profile fetch error:', profileError.code, profileError.message)
            
            if (profileError.code === 'PGRST116') {
              // Profile doesn't exist - keep the basic profile we set earlier
              console.log('UserProvider: No profile found in database, using basic profile')
            }
            // Set loading to false after profile operations
            if (mountedRef.current) setLoading(false)
            
          } else if (profileData && mountedRef.current) {
            console.log('UserProvider: ✅ Profile loaded successfully')
            setProfile(profileData)
            setLoading(false)
          } else {
            // Fallback - no profile data but no error
            console.log('UserProvider: No profile data returned, using basic profile')
            if (mountedRef.current) setLoading(false)
          }
          
        } catch (profileErr) {
          console.error('UserProvider: ❌ Profile operation exception:', profileErr)
          // ALWAYS stop loading on exceptions
          if (mountedRef.current) setLoading(false)
        }
        
        } else {
        // No user - clear everything
        console.log('UserProvider: No user, clearing state')
          setUser(null)
          setProfile(null)
          setLoading(false)
          lastProcessedUserId.current = null
        }
    }

    const initAuth = async () => {
      try {
        console.log('UserProvider: Setting up auth listener...')
        
        // Set up auth state change listener - only for real auth changes, not initial load
        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mountedRef.current) return
          
          // Skip INITIAL_SESSION - handled by initAuth
          if (event === 'INITIAL_SESSION') {
            console.log('UserProvider: Skipping INITIAL_SESSION (handled by initAuth)')
            return
          }
          
          // Skip SIGNED_IN if we've already processed this user (prevents duplicate processing)
          if (event === 'SIGNED_IN' && session?.user?.id && lastProcessedUserId.current === session.user.id) {
            console.log('UserProvider: Skipping SIGNED_IN - already authenticated this user:', session.user.email)
            return
          }
          
          // Skip TOKEN_REFRESHED events - these are automatic and don't need user processing
          if (event === 'TOKEN_REFRESHED') {
            console.log('UserProvider: Token refreshed silently (no user processing needed)')
            return
          }
          
          // Debounce rapid auth state changes to prevent loops
          if (authStateChangeTimeout) {
            clearTimeout(authStateChangeTimeout)
          }
          
          authStateChangeTimeout = setTimeout(async () => {
            if (!mountedRef.current) return
            
            console.log('UserProvider: Auth state changed:', event, session?.user?.email || 'none')
            
            // Handle genuine auth events (excluding TOKEN_REFRESHED which is handled above)
            if (event === 'SIGNED_IN') {
              console.log('UserProvider: Processing genuine sign-in event')
              await handleAuthUser(session?.user, `listener-${event}`)
            } else if (event === 'SIGNED_OUT' || !session) {
              console.log('UserProvider: Detected sign-out event, clearing user...')
              await handleAuthUser(null, `listener-${event}`)
              initialSessionProcessed.current = false // Reset for next session
              lastProcessedUserId.current = null // Reset user tracking
            }
          }, 100)
        })

        authListener = listener
        
        // Get initial session once - this handles the initial authentication state
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
          if (sessionError) {
            console.error('UserProvider: Session error:', sessionError)
            if (mountedRef.current) {
              setLoading(false)
            }
          } else {
            console.log('UserProvider: Initial session result:', session?.user?.email || 'none')
            // Process initial session - this is the definitive auth state on app load
            await handleAuthUser(session?.user, 'initial-session')
            initialSessionProcessed.current = true // Mark that we've processed initial session
          }
        } catch (error) {
          console.error('UserProvider: Session fetch failed:', error)
          if (mountedRef.current) {
            setLoading(false)
          }
        }
        
      } catch (error) {
        console.error('UserProvider: Auth initialization failed:', error)
        if (mountedRef.current) {
          setLoading(false)
        }
        }
    }

    // Start auth initialization
    initAuth()

    // Cleanup function
    return () => {
      console.log('UserProvider: Cleaning up...')
      mountedRef.current = false
      
      if (authStateChangeTimeout) {
        clearTimeout(authStateChangeTimeout)
      }
      
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe()
      }
      
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, []) // Run only once


  return (
    <UserContext.Provider value={{ user, profile, loading, refreshProfile, logout, refreshSession }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
} 