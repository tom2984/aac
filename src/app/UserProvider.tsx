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

  // Session validation to prevent ghost mode
  const validateSession = async () => {
    try {
      console.log('UserProvider: Validating session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('UserProvider: Session validation error:', error)
        if (user) {
          console.log('UserProvider: Session invalid but user exists - clearing ghost state')
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
        return
      }
      
      if (!session && user) {
        console.log('UserProvider: No session but user exists - clearing ghost state')
        setUser(null)
        setProfile(null)
        setLoading(false)
      } else if (session && (!user || user.id !== session.user.id)) {
        console.log('UserProvider: Session exists but user mismatch - refreshing user')
        setUser(session.user)
        // Basic profile will be handled by auth state change listener
      }
    } catch (error) {
      console.error('UserProvider: Session validation exception:', error)
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

    const handleAuthUser = async (authUser: any, source: string) => {
      if (!mountedRef.current) return

      console.log(`UserProvider: Processing auth user from ${source}:`, authUser?.email || 'none')
      
      if (authUser) {
        // Set user immediately
        setUser(authUser)
        
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
        // Don't stop loading immediately - wait for real profile fetch
        console.log('UserProvider: Set basic profile, starting profile fetch...')
        
        // Add timeout protection to prevent hanging
        const profileTimeout = setTimeout(() => {
          console.error('🚨 UserProvider: Profile operation timeout - forcing loading to stop')
          if (mountedRef.current) setLoading(false)
        }, 8000) // 8 second timeout
        
        // Try to fetch real profile immediately
        try {
          console.log('UserProvider: Starting profile fetch...')
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single()
        
          clearTimeout(profileTimeout) // Clear timeout on successful fetch
          
          if (profileError) {
            console.error('UserProvider: Profile fetch error:', profileError.code, profileError.message)
            
            if (profileError.code === 'PGRST116') {
              console.log('UserProvider: No profile found, creating one...')
              
              // Retry profile creation with backoff
              let createSuccess = false
              for (let attempt = 1; attempt <= 3 && !createSuccess && mountedRef.current; attempt++) {
                console.log(`UserProvider: Profile creation attempt ${attempt}/3`)
                
                try {
                  const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({
                      id: authUser.id,
                      email: authUser.email,
                      role: authUser.user_metadata?.role || 'employee',
                      status: 'active',
                      first_name: authUser.user_metadata?.first_name || '',
                      last_name: authUser.user_metadata?.last_name || ''
                    })
                    .select()
                    .single()
                  
                  if (!createError && newProfile && mountedRef.current) {
                    console.log('UserProvider: ✅ Created profile successfully:', newProfile)
                    setProfile(newProfile)
                    createSuccess = true
                  } else {
                    console.error(`UserProvider: ❌ Profile creation attempt ${attempt} failed:`, createError)
                    if (attempt < 3) {
                      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
                    }
                  }
                } catch (createErr) {
                  console.error(`UserProvider: ❌ Profile creation attempt ${attempt} exception:`, createErr)
                  if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
                  }
                }
              }
            }
            // ALWAYS set loading to false after profile operations
            if (mountedRef.current) setLoading(false)
            
          } else if (profileData && mountedRef.current) {
            console.log('UserProvider: ✅ Loaded existing profile:', profileData)
            setProfile(profileData)
            setLoading(false) // Stop loading after successful profile fetch
          } else {
            // Fallback - no profile data but no error
            console.warn('UserProvider: ⚠️ No profile data returned, stopping loading')
            if (mountedRef.current) setLoading(false)
          }
          
        } catch (profileErr) {
          clearTimeout(profileTimeout)
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
        }
    }

    const initAuth = async () => {
      try {
        console.log('UserProvider: Setting up auth listener...')
        
        // Set up auth state change listener
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mountedRef.current) return
          console.log('UserProvider: Auth state changed:', event, session?.user?.email || 'none')
          
          // Handle all auth events that indicate a user is signed in
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || (event === 'INITIAL_SESSION' && session)) {
            console.log('UserProvider: Detected sign-in event, processing user...')
            await handleAuthUser(session?.user, `listener-${event}`)
          } else if (event === 'SIGNED_OUT' || !session) {
            console.log('UserProvider: Detected sign-out event, clearing user...')
            await handleAuthUser(null, `listener-${event}`)
          }
    })

        authListener = listener
        
        console.log('UserProvider: Getting initial session...')
    
        // Get initial session with longer timeout and retry logic
        const getSessionWithRetry = async (attempt = 1) => {
          try {
            console.log(`UserProvider: Getting session (attempt ${attempt})...`)
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            
            if (sessionError) {
              console.error(`UserProvider: Session error on attempt ${attempt}:`, sessionError)
              if (attempt < 3) {
                console.log(`UserProvider: Retrying session fetch in 1s...`)
                await new Promise(resolve => setTimeout(resolve, 1000))
                return getSessionWithRetry(attempt + 1)
              }
              throw sessionError
            }
            
            return { data: { session }, error: sessionError }
          } catch (error) {
            if (attempt < 3) {
              console.log(`UserProvider: Session fetch failed, retrying...`)
              await new Promise(resolve => setTimeout(resolve, 1000))
              return getSessionWithRetry(attempt + 1)
            }
            throw error
          }
        }
        
        try {
          const { data: { session }, error: sessionError } = await getSessionWithRetry()
        
          if (sessionError) {
            console.error('UserProvider: Final session error after retries:', sessionError)
            if (mountedRef.current) {
              setLoading(false)
            }
          } else {
            console.log('UserProvider: Initial session result:', session?.user?.email || 'none')
            await handleAuthUser(session?.user, 'initial')
          }
        } catch (error) {
          console.error('UserProvider: Session fetch failed after all retries:', error)
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
    
    // Set up periodic session validation to prevent ghost mode
    console.log('UserProvider: Setting up session validation interval')
    const sessionValidationInterval = setInterval(() => {
      if (mountedRef.current) {
        validateSession()
      }
    }, 30000) // Check every 30 seconds

    // Cleanup function
    return () => {
      console.log('UserProvider: Cleaning up...')
      mountedRef.current = false
      clearInterval(sessionValidationInterval)
      
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, []) // Run only once

  // Manual session refresh for admin actions
  const refreshSession = async () => {
    console.log('UserProvider: Manual session refresh requested')
    await validateSession()
  }

  return (
    <UserContext.Provider value={{ user, profile, loading, refreshProfile, logout, refreshSession }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
} 