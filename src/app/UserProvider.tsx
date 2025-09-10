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
      
      // Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token')
        sessionStorage.clear()
      }
      
      // Sign out from Supabase
      await supabase.auth.signOut()

      // Clear local state immediately
      setUser(null)
      setProfile(null)
      setLoading(false)
      
      // Redirect to home page
      window.location.href = '/'
      
    } catch (error) {
      console.error('UserProvider: Error during logout:', error)
      // Force logout anyway
      setUser(null)
      setProfile(null)
      setLoading(false)
      window.location.href = '/'
    }
  }

  useEffect(() => {
    mountedRef.current = true
    console.log('UserProvider: Component mounted, starting auth initialization')

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
          await handleAuthUser(session?.user, 'listener')
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