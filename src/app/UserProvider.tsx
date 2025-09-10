'use client'
import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const UserContext = createContext<{
  user: any;
  profile: any;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
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
        
        // Try to fetch real profile immediately
        try {
          console.log('UserProvider: Starting profile fetch...')
          const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
            .eq('id', authUser.id)
          .single()
        
          if (profileError) {
            console.error('UserProvider: Profile fetch error:', profileError.code, profileError.message)
            
            if (profileError.code === 'PGRST116') {
              console.log('UserProvider: No profile found, creating one...')
              const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                  id: authUser.id,
                  email: authUser.email,
                  role: 'admin',
                  status: 'active',
                  first_name: '',
                  last_name: ''
                })
                .select()
                .single()
              
              if (!createError && newProfile && mountedRef.current) {
                console.log('UserProvider: Created new profile:', newProfile)
                setProfile(newProfile)
              }
            }
            // Set loading to false even if profile fetch fails
            if (mountedRef.current) setLoading(false)
          } else if (profileData && mountedRef.current) {
            console.log('UserProvider: Loaded real profile:', profileData)
            setProfile(profileData)
            setLoading(false) // Stop loading after successful profile fetch
          }
        } catch (profileErr) {
          console.error('UserProvider: Profile fetch exception:', profileErr)
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
    
        // Get initial session with short timeout
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 2000)
        )
        
        try {
          const { data: { session }, error: sessionError } = await Promise.race([sessionPromise, timeoutPromise])
        
          if (sessionError) {
            console.error('UserProvider: getSession error:', sessionError)
        } else {
            console.log('UserProvider: Initial session result:', session?.user?.email || 'none')
            await handleAuthUser(session?.user, 'initial')
          }
        } catch (timeoutError) {
          console.error('UserProvider: getSession timeout - setting loading to false')
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
      
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, []) // Run only once

  return (
    <UserContext.Provider value={{ user, profile, loading, refreshProfile, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
} 