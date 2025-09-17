"use client"

import { AreaChart, Area, ResponsiveContainer, Tooltip, CartesianGrid, XAxis, YAxis } from 'recharts'
import { CloudSun, Wrench, Info, CheckCircle2, Clock, Hourglass, Users, Package, Droplets, LogOut, TrendingUp, Award } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { bisector } from 'd3-array'
import { useForms } from '@/hooks/useForms'
import { supabaseAPI } from '@/lib/supabase-api'
import { supabase } from '@/lib/supabase'
import { useFilteredForms } from '@/hooks/useFilteredForms'
import { useUser } from '@/app/UserProvider'
import FilterDrawer, { FilterOption } from '@/components/FilterDrawer'
import { useSortableColumn } from '@/hooks/useSortableColumn'
import { AdminOnly } from '@/components/RoleGuard'

const months = [
  '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
  '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'
]
const reasons = [
  { key: 'weather', label: 'Hours lost due the weather', icon: <CloudSun className="w-6 h-6 text-[#FF6551]" />, color: '#FF6551' },
  { key: 'technical', label: 'Hours lost due the technical problems', icon: <Wrench className="w-6 h-6 text-[#FF6551]" />, color: '#FF6551' },
  { key: 'other', label: 'Hours lost due other reasons', icon: <Info className="w-6 h-6 text-[#FF6551]" />, color: '#FF6551' },
  { key: 'client', label: 'Hours lost due to client', icon: <Users className="w-6 h-6 text-[#FF6551]" />, color: '#FF6551' },
  { key: 'materials', label: 'Hours lost - materials not arriving (supplier)', icon: <Package className="w-6 h-6 text-[#FF6551]" />, color: '#FF6551' },
  { key: 'drying', label: 'Hours lost due to weather drying up', icon: <Droplets className="w-6 h-6 text-[#FF6551]" />, color: '#FF6551' },
  { key: 'leaving', label: 'Hours lost due to leaving site', icon: <LogOut className="w-6 h-6 text-[#FF6551]" />, color: '#FF6551' },
]

// This will be replaced with dynamic data
const formsStatsTemplate = [
  {
    key: 'confirmed',
    icon: <CheckCircle2 className="w-6 h-6 text-[#4FC62B]" />,
    label: 'Forms Confirmed',
    deltaColor: 'text-[#4FC62B]',
    chart: 'green',
    stroke: '#4FC62B',
    fill: 'url(#greenArea)',
  },
  {
    key: 'in_progress',
    icon: <Clock className="w-6 h-6 text-[#FFB800]" />,
    label: 'Forms In progress',
    deltaColor: 'text-[#FFB800]',
    chart: 'orange',
    stroke: '#FFB800',
    fill: 'url(#orangeArea)',
  },
  {
    key: 'overdue',
    icon: <Hourglass className="w-6 h-6 text-[#7B61FF]" />,
    label: 'Overdue Forms',
    deltaColor: 'text-[#7B61FF]',
    chart: 'purple',
    stroke: '#7B61FF',
    fill: 'url(#purpleArea)',
  },
]

// Analytics stats template for the new section
const analyticsStatsTemplate = [
  {
    key: 'advanced_negotiations',
    icon: <TrendingUp className="w-6 h-6 text-[#2563EB]" />,
    label: 'Amount in Advanced Negotiations',
    deltaColor: 'text-[#2563EB]',
    chart: 'blue',
    stroke: '#2563EB',
    fill: 'url(#blueArea)',
  },
  {
    key: 'amount_won',
    icon: <Award className="w-6 h-6 text-[#10B981]" />,
    label: 'Amount Won',
    deltaColor: 'text-[#10B981]',
    chart: 'green',
    stroke: '#10B981',
    fill: 'url(#successArea)',
  },
]

const users = [
  'Leslie Alexander',
  'Dmytro Kalenskyi',
  'Dmytro Kalenskyyi',
]

type DataPoint = { name: string | number; value: number }
const getNearestDataPoint = (
  data: DataPoint[],
  xAccessor: (d: DataPoint) => string | number,
  xValue: string | number
): DataPoint | null => {
  if (!data || !data.length) return null
  const bisectFn = bisector(xAccessor).left
  const idx = bisectFn(data, xValue)
  if (idx === 0) return data[0]
  if (idx >= data.length) return data[data.length - 1]
  // Choose closer of idx-1 and idx
  const d0 = data[idx - 1]
  const d1 = data[idx]
  return Math.abs(Number(xAccessor(d0)) - Number(xValue)) < Math.abs(Number(xAccessor(d1)) - Number(xValue)) ? d0 : d1
}

// Add formsColumns definition if not present
const formsColumns: string[] = [
  'Description', 'Site', 'Module', 'Responsible', 'Due'
]

const initialDaysLost = { weather: 0, technical: 0, other: 0, client: 0, materials: 0, drying: 0, leaving: 0 };

export default function AnalyticsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerData, setDrawerData] = useState<{ stat: any, dataPoint: any } | null>(null)
  const [lastHovered, setLastHovered] = useState<any>(null)
  
  // Consistent currency formatting function
  const formatCurrency = (amount: number) => {
    return `£${Math.round(amount).toLocaleString()}`
  }
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [focusedStat, setFocusedStat] = useState<any>(null)
  const userContext = useUser()
  const user = userContext?.user ? { id: userContext.user.id, ...userContext.profile } : null
  
  // Hours Lost filtering state
  const [daysLostUserFilter, setDaysLostUserFilter] = useState('All')
  const [daysLostModuleFilter, setDaysLostModuleFilter] = useState('All')
  const [daysLostDateFrom, setDaysLostDateFrom] = useState('')
  const [daysLostDateTo, setDaysLostDateTo] = useState('')
  
  // Forms filtering state
  const [formsModuleFilter, setFormsModuleFilter] = useState('All')
  const [formsPersonFilter, setFormsPersonFilter] = useState('All')
  const [formsDateFrom, setFormsDateFrom] = useState('')
  const [formsDateTo, setFormsDateTo] = useState('')
  
  // Focused view filtering state
  const [focusedUserFilter, setFocusedUserFilter] = useState('All')
  const [focusedModuleFilter, setFocusedModuleFilter] = useState('All')
  const [focusedPersonFilter, setFocusedPersonFilter] = useState('All')

  const [focusedDateFrom, setFocusedDateFrom] = useState('')
  const [focusedDateTo, setFocusedDateTo] = useState('')
  const [focusedSearchTerm, setFocusedSearchTerm] = useState('')
  
  // Analytics filtering state
  const [analyticsModuleFilter, setAnalyticsModuleFilter] = useState('All')
  const [analyticsPersonFilter, setAnalyticsPersonFilter] = useState('All')
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState('')
  const [analyticsDateTo, setAnalyticsDateTo] = useState('')
  const [analyticsFilterDrawerOpen, setAnalyticsFilterDrawerOpen] = useState(false)
  
  // Debug: Log filter state on every render
  useEffect(() => {
    console.log('🔍 Analytics Filter State:', { 
      analyticsDateFrom, 
      analyticsDateTo, 
      hasFilters: !!(analyticsDateFrom || analyticsDateTo) 
    });
  }, [analyticsDateFrom, analyticsDateTo])
  
  // Pagination states for focused view
  const [focusedCurrentPage, setFocusedCurrentPage] = useState(1)
  const focusedItemsPerPage = 10
  
  // Reset focused pagination when filters change
  useEffect(() => {
    setFocusedCurrentPage(1)
  }, [focusedModuleFilter, focusedPersonFilter, focusedDateFrom, focusedDateTo, focusedSearchTerm])
  
  // State for showing more hours lost graphs
  const [showMoreHoursLost, setShowMoreHoursLost] = useState(false)
  
  // Filter drawer states
  const [daysLostFilterDrawerOpen, setDaysLostFilterDrawerOpen] = useState(false)
  const [formsFilterDrawerOpen, setFormsFilterDrawerOpen] = useState(false)
  const [focusedFilterDrawerOpen, setFocusedFilterDrawerOpen] = useState(false)
  
  // Use filtered forms hook for the Forms section
  const { 
    forms, 
    loading: formsLoading, 
    error: formsError,
    availableUsers: formsAvailableUsers,
    availableModules: formsAvailableModules,
    total: formsTotal
  } = useFilteredForms({
    module: formsModuleFilter !== 'All' ? formsModuleFilter : undefined,
    userId: formsPersonFilter !== 'All' ? formsPersonFilter : undefined,
    dateFrom: formsDateFrom || undefined,
    dateTo: formsDateTo || undefined,
    adminId: user?.id
  })
  
  // Use filtered forms hook for the focused view
  const { 
    forms: focusedForms, 
    loading: focusedFormsLoading, 
    error: focusedFormsError,
    availableUsers: focusedAvailableUsers,
    availableModules: focusedAvailableModules,
    total: focusedFormsTotal
  } = useFilteredForms({
    module: focusedModuleFilter !== 'All' ? focusedModuleFilter : undefined,
    userId: focusedPersonFilter !== 'All' ? focusedPersonFilter : undefined,
    dateFrom: focusedDateFrom || undefined,
    dateTo: focusedDateTo || undefined,
    search: focusedSearchTerm || undefined,
    adminId: user?.id
  })
  
  // Due date sorting hook for focused forms (moved to top level to fix infinite re-render issue)
  const dueDateSort = useSortableColumn(
    focusedForms,
    (form) => form.settings?.due_date
  )
  
  const [sidebarData, setSidebarData] = useState<any>(null)
  const [sidebarLoading, setSidebarLoading] = useState(false)
  const [sidebarError, setSidebarError] = useState<string | null>(null)
  const [daysLostData, setDaysLostData] = useState<any>(null)
  const [daysLostLoading, setDaysLostLoading] = useState(true)
  const [daysLostAvailableUsers, setDaysLostAvailableUsers] = useState<any[]>([])
  const [daysLostAvailableModules, setDaysLostAvailableModules] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11); // Last 12 months
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // Current month
  });
  const [allDaysLostData, setAllDaysLostData] = useState<Record<string, any[]>>({ weather: [], technical: [], other: [], client: [], materials: [], drying: [], leaving: [] })
  const [daysLost, setDaysLost] = useState(initialDaysLost);
  const [sidebarFormsData, setSidebarFormsData] = useState<Record<string, Record<string, Record<string, number>>>>({ weather: {}, technical: {}, other: {}, client: {}, materials: {}, drying: {}, leaving: {} })
  const formMap = useRef<Record<string, any>>({})
  const formsByReason = useRef<Record<string, Set<string>>>({ weather: new Set(), technical: new Set(), other: new Set(), client: new Set(), materials: new Set(), drying: new Set(), leaving: new Set() })
  
  // Dynamic forms stats state
  const [formsStats, setFormsStats] = useState<any[]>([])
  const [formsStatsLoading, setFormsStatsLoading] = useState(true)
  const [analyticsStats, setAnalyticsStats] = useState<any[]>([])
  const [analyticsStatsLoading, setAnalyticsStatsLoading] = useState(true)
  const [analyticsMetadata, setAnalyticsMetadata] = useState<any>(null)
  
  // State for filtered focused forms
  const [filteredFocusedForms, setFilteredFocusedForms] = useState<any[]>([])
  const [focusedFormsFiltering, setFocusedFormsFiltering] = useState(false)

  // Optimized: Fetch all forms, questions, responses, and answers in one go
  useEffect(() => {
    const fetchAllData = async () => {
      setDaysLostLoading(true)
      try {
        const { data: analyticsData } = await supabaseAPI.getAnalyticsDaysLost(daysLostUserFilter)
        if (!analyticsData) return setDaysLostLoading(false)
        
        const { forms: formsData, questions: questionsData, responses: responsesData, answers: answersData } = analyticsData
        if (!formsData || !questionsData || !responsesData || !answersData) return setDaysLostLoading(false)

        formMap.current = Object.fromEntries(formsData.map((f: any) => [f.id, f]))
        const questionMap = Object.fromEntries(questionsData.map((q: any) => [q.id, q]))
        const responseMap = Object.fromEntries(responsesData.map((r: any) => [r.id, r]))

        // Extract available users from forms data with robust deduplication
        const allUsers = formsData.flatMap((f: any) => f.metadata?.users || [])
        const userMap = new Map()
        allUsers.forEach((user: any) => {
          if (user?.id && !userMap.has(user.id)) {
            userMap.set(user.id, user)
          }
        })
        const uniqueUsers = Array.from(userMap.values())
        setDaysLostAvailableUsers(uniqueUsers)

        // Extract available modules from forms data
        const allModules = Array.from(new Set(formsData.map((f: any) => f.settings?.module).filter(Boolean))) as string[]
        setDaysLostAvailableModules(allModules)

        const result: Record<string, any[]> = { weather: [], technical: [], other: [], client: [], materials: [], drying: [], leaving: [] }
        const byReasonMonthForm: Record<string, Record<string, Record<string, number>>> = { weather: {}, technical: {}, other: {}, client: {}, materials: {}, drying: {}, leaving: {} }
        
        // Determine date range based on filters (same logic as Forms)
        let startDate: Date, endDate: Date
        if (daysLostDateFrom || daysLostDateTo) {
          // Use filtered date range
          startDate = daysLostDateFrom ? new Date(daysLostDateFrom) : new Date('2020-01-01')
          endDate = daysLostDateTo ? new Date(daysLostDateTo) : new Date()
        } else {
          // Use default 12-month range
          startDate = new Date()
          startDate.setMonth(startDate.getMonth() - 11)
          endDate = new Date()
        }
        
        // Calculate time granularity based on date range
        const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        let granularity: 'day' | 'week' | 'month' = 'month'
        
        if (daysDifference <= 31) {
          granularity = 'day'
        } else if (daysDifference <= 90) {
          granularity = 'week'
        } else {
          granularity = 'month'
        }
        
        // Helper function to get period identifier from date
        const getPeriodFromDate = (dateStr: string): string => {
          const date = new Date(dateStr)
          if (granularity === 'day') {
            return dateStr.slice(0, 10) // YYYY-MM-DD
          } else if (granularity === 'week') {
            // Get start of week (Sunday)
            const startOfWeek = new Date(date)
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
            return startOfWeek.toISOString().slice(0, 10)
          } else {
            return dateStr.slice(0, 7) // YYYY-MM
          }
        }
        
        // Generate time periods within the date range based on granularity
        const months: { month: string; name: string }[] = []
        const currentDate = new Date(startDate)
        
        if (granularity === 'day') {
          // Generate daily periods
          while (currentDate <= endDate) {
            const periodStr = currentDate.toISOString().slice(0, 10) // YYYY-MM-DD
            const displayName = currentDate.toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: 'short' 
            })
            
            months.push({
              month: periodStr,
              name: displayName
            })
            currentDate.setDate(currentDate.getDate() + 1)
          }
        } else if (granularity === 'week') {
          // Generate weekly periods (start of each week)
          currentDate.setDate(currentDate.getDate() - currentDate.getDay()) // Start from Sunday
          while (currentDate <= endDate) {
            const periodStr = currentDate.toISOString().slice(0, 10) // Use start of week as identifier
            const displayName = `${currentDate.getDate()} ${currentDate.toLocaleDateString('en-GB', { month: 'short' })}`
            
            months.push({
              month: periodStr,
              name: displayName
            })
            currentDate.setDate(currentDate.getDate() + 7)
          }
        } else {
          // Generate monthly periods (existing logic)
          currentDate.setDate(1) // Start from first day of month
          while (currentDate <= endDate) {
            const periodStr = currentDate.toISOString().slice(0, 7) // YYYY-MM
            const displayName = currentDate.toLocaleString('en-GB', { month: 'short', year: '2-digit' })
            
            months.push({
              month: periodStr,
              name: displayName
            })
            currentDate.setMonth(currentDate.getMonth() + 1)
          }
        }
        
        // Reset forms by reason tracking
        formsByReason.current = { weather: new Set(), technical: new Set(), other: new Set(), client: new Set(), materials: new Set(), drying: new Set(), leaving: new Set() }
        
        // First, find all periods that actually have data
        const periodsWithData = new Set<string>()
        for (const answer of answersData) {
          const response = responseMap[answer.response_id]
          if (!response || !response.submitted_at) continue
          
          const periodStr = getPeriodFromDate(response.submitted_at)
          const question = questionMap[answer.question_id]
          if (!question) continue
          
          const form = formMap.current[question.form_id]
          if (!form) continue
          
          // Apply filters to see if this period should be included
          let includePeriod = true
          
          // Note: User filter is now handled by the API, so we don't need to filter here
          
          // Apply module filter
          if (daysLostModuleFilter !== 'All') {
            const formModule = form.settings?.module
            if (formModule !== daysLostModuleFilter) includePeriod = false
          }
          
          // Apply date filters
          if (daysLostDateFrom && response.submitted_at.slice(0, 10) < daysLostDateFrom) includePeriod = false
          if (daysLostDateTo && response.submitted_at.slice(0, 10) > daysLostDateTo) includePeriod = false
          
          // Check if this answer has any data for any reason
          const answerObj = answer.answer || {}
          const hasData = reasons.some(reason => Number(answerObj[reason.key] || 0) > 0)
          
          if (includePeriod && hasData) {
            periodsWithData.add(periodStr)
          }
        }
        
        // Process all periods in the selected date range (show 0 for periods without data)
        for (const reason of reasons) {
          for (const { month: periodStr, name: periodName } of months) {
            let total = 0
            let formsCount = 0
            const formTotals: Record<string, number> = {}
            
            for (const answer of answersData) {
              const response = responseMap[answer.response_id]
              if (!response || !response.submitted_at) continue
              
              const answerPeriod = getPeriodFromDate(response.submitted_at)
              if (answerPeriod !== periodStr) continue
              
              const question = questionMap[answer.question_id]
              if (!question) continue
              
              const form = formMap.current[question.form_id]
              if (!form) continue
              
              // Note: User filter is now handled by the API, so we don't need to filter here
              
              // Apply module filter if set
              if (daysLostModuleFilter !== 'All') {
                const formModule = form.settings?.module
                if (formModule !== daysLostModuleFilter) continue
              }
              
              // Apply date filters if set
              if (daysLostDateFrom && response.submitted_at && response.submitted_at.slice(0, 10) < daysLostDateFrom) continue
              if (daysLostDateTo && response.submitted_at && response.submitted_at.slice(0, 10) > daysLostDateTo) continue
              
              const answerObj = answer.answer || {}
              const value = Number(answerObj[reason.key] || 0)
              if (value > 0) {
                // Track which forms have data for this specific reason
                formsByReason.current[reason.key as 'weather' | 'technical' | 'other'].add(form.id)
              }
              if (!formTotals[form.id]) formTotals[form.id] = 0
              formTotals[form.id] += value
              total += value
            }
            
            formsCount = Object.keys(formTotals).length
            // Always add the period to show complete date range (even if value is 0)
            result[reason.key].push({ 
              month: periodStr, 
              value: total, 
              formsCount, 
              name: periodName
            })
            const reasonKey = reason.key as 'weather' | 'technical' | 'other' | 'client' | 'materials' | 'drying' | 'leaving'
            byReasonMonthForm[reasonKey][periodStr] = formTotals
          }
        }
        
        setAllDaysLostData(result)
        setSidebarFormsData(byReasonMonthForm)
        setDaysLostLoading(false)
      } catch (error) {
        console.error('Error fetching analytics data:', error)
        setDaysLostLoading(false)
      }
    }
    fetchAllData()
  }, [daysLostUserFilter, daysLostModuleFilter]) // Re-fetch when non-date filters change

  // Calculate dynamic forms stats
  useEffect(() => {
    const calculateFormsStats = async () => {
      if (!user?.id || formsLoading) return
      
      setFormsStatsLoading(true)
      try {
        // Get all form responses
        const { data: responses, error: responsesError } = await supabase
          .from('form_responses')
          .select('form_id, respondent_id, submitted_at')
        
        if (responsesError) throw responsesError

        const today = new Date().toISOString().split('T')[0]
        
        // Generate date range based on filters
        let startDate: Date, endDate: Date
        if (formsDateFrom || formsDateTo) {
          // Use filtered date range
          startDate = formsDateFrom ? new Date(formsDateFrom) : new Date('2020-01-01')
          endDate = formsDateTo ? new Date(formsDateTo) : new Date()
        } else {
          // Use default 12-month range
          startDate = new Date()
          startDate.setMonth(startDate.getMonth() - 11)
          endDate = new Date()
        }
        
        // Calculate time granularity for forms stats based on date range
        const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        let formsGranularity: 'day' | 'week' | 'month' = 'month'
        
        if (daysDifference <= 31) {
          formsGranularity = 'day'
        } else if (daysDifference <= 90) {
          formsGranularity = 'week'
        } else {
          formsGranularity = 'month'
        }
        
        // Helper function for forms period calculation
        const getFormsPeriodFromDate = (dateStr: string): string => {
          const date = new Date(dateStr)
          if (formsGranularity === 'day') {
            return dateStr.slice(0, 10) // YYYY-MM-DD
          } else if (formsGranularity === 'week') {
            // Get start of week (Sunday)
            const startOfWeek = new Date(date)
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
            return startOfWeek.toISOString().slice(0, 10)
          } else {
            return dateStr.slice(0, 7) // YYYY-MM
          }
        }
        
        // Generate time periods for forms based on granularity
        const months: { month: string; name: string }[] = []
        const currentDate = new Date(startDate)
        
        if (formsGranularity === 'day') {
          // Generate daily periods
          while (currentDate <= endDate) {
            const periodStr = currentDate.toISOString().slice(0, 10) // YYYY-MM-DD
            const displayName = currentDate.toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: 'short' 
            })
            
            months.push({
              month: periodStr,
              name: displayName
            })
            currentDate.setDate(currentDate.getDate() + 1)
          }
        } else if (formsGranularity === 'week') {
          // Generate weekly periods (start of each week)
          currentDate.setDate(currentDate.getDate() - currentDate.getDay()) // Start from Sunday
          while (currentDate <= endDate) {
            const periodStr = currentDate.toISOString().slice(0, 10) // Use start of week as identifier
            const displayName = `${currentDate.getDate()} ${currentDate.toLocaleDateString('en-GB', { month: 'short' })}`
            
            months.push({
              month: periodStr,
              name: displayName
            })
            currentDate.setDate(currentDate.getDate() + 7)
          }
        } else {
          // Generate monthly periods (existing logic)
          currentDate.setDate(1) // Start from first day of month
          while (currentDate <= endDate) {
            const periodStr = currentDate.toISOString().slice(0, 7) // YYYY-MM
            const displayName = currentDate.toLocaleString('en-GB', { month: 'short', year: '2-digit' })
            
            months.push({
              month: periodStr,
              name: displayName
            })
            currentDate.setMonth(currentDate.getMonth() + 1)
          }
        }

        const statsData = formsStatsTemplate.map(template => {
          const monthlyData = months.map(({ month, name }) => {
            let count = 0
            
            for (const form of forms) {
              const formUsers = form.metadata?.users || []
              const dueDate = form.settings?.due_date
              
              // Apply filters if set
              if (formsModuleFilter !== 'All' && form.settings?.module !== formsModuleFilter) continue
              if (formsPersonFilter !== 'All') {
                const hasUser = formUsers.some((u: any) => u.id === formsPersonFilter)
                if (!hasUser) continue
              }
              if (formsDateFrom && dueDate && dueDate < formsDateFrom) continue
              if (formsDateTo && dueDate && dueDate > formsDateTo) continue

              // Only count forms created/due in this period
              const formPeriod = getFormsPeriodFromDate(form.created_at || dueDate || '')
              if (formPeriod !== month) continue

              for (const formUser of formUsers) {
                const userResponse = responses?.find((r: any) => 
                  r.form_id === form.id && r.respondent_id === formUser.id
                )

                if (template.key === 'confirmed') {
                  // Completed on time (submitted before or on due date)
                  if (userResponse && dueDate && userResponse.submitted_at) {
                    const submittedDate = userResponse.submitted_at.split('T')[0]
                    if (submittedDate <= dueDate) {
                      count++
                    }
                  }
                } else if (template.key === 'in_progress') {
                  // Currently pending (no response and not overdue yet)
                  if (!userResponse && dueDate && dueDate >= today) {
                    count++
                  }
                } else if (template.key === 'overdue') {
                  // Overdue (no response and past due date)
                  if (!userResponse && dueDate && dueDate < today) {
                    count++
                  }
                }
              }
            }
            
            return { value: count, name }
          })

          // Filter data by date range if filters are applied
          let filteredData = monthlyData
          if (formsDateFrom || formsDateTo) {
            filteredData = monthlyData.filter(item => {
              const itemMonth = months.find(m => m.name === item.name)?.month
              if (!itemMonth) return false
              
              const itemDate = itemMonth + '-01'
              const fromOk = !formsDateFrom || itemDate >= formsDateFrom
              const toOk = !formsDateTo || itemDate <= formsDateTo
              return fromOk && toOk
            })
          }

          // Use the total for the period instead of just the last value
          const currentValue = filteredData.reduce((sum, item) => sum + (item.value || 0), 0)

          console.log(`📊 ${template.key} Forms total:`, {
            currentValue,
            note: 'No percentage calculations - showing total values only'
          });

          return {
            ...template,
            value: currentValue,
            delta: '0%', // No percentages
            data: filteredData.length > 0 ? filteredData : monthlyData
          }
        })

        setFormsStats(statsData)
      } catch (error) {
        console.error('Error calculating forms stats:', error)
        // Use template with zero values on error
        setFormsStats(formsStatsTemplate.map(template => ({
          ...template,
          value: 0,
          delta: '0%', // No percentages
          data: Array.from({ length: 12 }, (_, i) => ({ value: 0, name: `Month ${i + 1}` }))
        })))
      } finally {
        setFormsStatsLoading(false)
      }
    }

    calculateFormsStats()
  }, [forms, formsLoading, formsModuleFilter, formsPersonFilter, user?.id])

  // Analytics stats calculation effect with daily auto-refresh
  useEffect(() => {
    const fetchHubSpotAnalytics = async (forceRefresh = false) => {
      try {
        setAnalyticsStatsLoading(true)
        
        console.log('🔄 Fetching HubSpot analytics with filters...', {
          dateFrom: analyticsDateFrom,
          dateTo: analyticsDateTo,
          refresh: forceRefresh
        })
        
        const response = await supabaseAPI.getHubSpotAnalytics({
          dateFrom: analyticsDateFrom || undefined,
          dateTo: analyticsDateTo || undefined,
          refresh: forceRefresh
        })
        
        if (response.success) {
          console.log('📋 Raw response data:', response.data);
          console.log('📊 Response metadata:', response.metadata);
          
          // Process API response data
          
          const analyticsData = response.data.map((item: any) => {
            const template = analyticsStatsTemplate.find(t => t.key === item.key)
            
            // Calculate delta from the data
            const data = item.data || []
            console.log(`📈 ${item.key} data:`, {
              dataLength: data.length,
              samplePoints: data.slice(0, 3),
              lastPoint: data[data.length - 1]
            });
            
            console.log(`📊 ${item.key}:`, {
              value: item.value,
              dataPoints: data.length
            });
            
            return {
              ...template,
              value: item.value,
              delta: '0%', // No percentages
              data: item.data
            }
          })
          
          // Debug final state
          console.log('📋 Final analyticsStats:', analyticsData.map((d: any) => ({
            key: d.key,
            value: d.value,
            dataLength: d.data?.length,
            lastDataPoint: d.data && d.data.length > 0 ? d.data[d.data.length - 1] : null,
            graphMaxValue: d.data ? Math.max(...d.data.map((item: any) => item.value || 0)) : 0
          })));
          
          console.log('🔍 Advanced Negotiations Debug:', {
            apiResponse: response.data.find((item: any) => item.key === 'advanced_negotiations'),
            displayValue: analyticsData.find((d: any) => d.key === 'advanced_negotiations')?.value,
            metadata: response.metadata
          })
          
          setAnalyticsStats(analyticsData)
          setAnalyticsMetadata(response.metadata)
          
          // Store last fetch timestamp for daily refresh tracking
          localStorage.setItem('hubspot_analytics_last_fetch', new Date().toISOString())
          
          console.log('✅ HubSpot analytics processed:', analyticsData.map((d: any) => ({
            key: d.key,
            value: d.value,
            dataPoints: d.data?.length || 0
          })));
          console.log('📊 Metadata:', response.metadata)
        } else {
          throw new Error('HubSpot API returned unsuccessful response')
        }
      } catch (error) {
        console.error('❌ Error fetching HubSpot analytics:', error)
        // Fall back to template with zero values
        setAnalyticsStats(analyticsStatsTemplate.map(template => ({
          ...template,
          value: '£0',
          delta: '0%', // No percentages
          data: Array.from({ length: 12 }, (_, i) => ({ value: 0, name: `Month ${i + 1}` }))
        })))
        setAnalyticsMetadata(null)
      } finally {
        setAnalyticsStatsLoading(false)
      }
    }

    // Check if we need to refresh based on last fetch time
    const checkForDailyRefresh = () => {
      const lastFetch = localStorage.getItem('hubspot_analytics_last_fetch')
      if (!lastFetch) {
        console.log('🔄 No previous fetch found - loading analytics data')
        fetchHubSpotAnalytics()
        return
      }

      const lastFetchTime = new Date(lastFetch)
      const now = new Date()
      const hoursSinceLastFetch = (now.getTime() - lastFetchTime.getTime()) / (1000 * 60 * 60)
      
      console.log('⏰ Hours since last HubSpot fetch:', hoursSinceLastFetch.toFixed(1))
      
      if (hoursSinceLastFetch >= 24) {
        console.log('🔄 Daily refresh needed - fetching fresh HubSpot data')
        fetchHubSpotAnalytics(true) // Force refresh for daily update
      } else {
        console.log('✅ Analytics data is still fresh - no refresh needed')
        fetchHubSpotAnalytics() // Regular fetch (may use cache)
      }
    }

    // Initial check
    checkForDailyRefresh()

    // Set up daily interval to check for updates (every hour)
    const dailyRefreshInterval = setInterval(() => {
      console.log('⏱️ Checking if daily analytics refresh is needed...')
      const lastFetch = localStorage.getItem('hubspot_analytics_last_fetch')
      if (lastFetch) {
        const lastFetchTime = new Date(lastFetch)
        const now = new Date()
        const hoursSinceLastFetch = (now.getTime() - lastFetchTime.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceLastFetch >= 24) {
          console.log('🔄 Daily refresh triggered - updating HubSpot analytics')
          fetchHubSpotAnalytics(true)
        }
      }
    }, 60 * 60 * 1000) // Check every hour

    // Cleanup interval on unmount
    return () => {
      clearInterval(dailyRefreshInterval)
    }
  }, []) // Only run once on mount, not on date changes

  // Manual refresh function
  const handleAnalyticsRefresh = () => {
    console.log('🔄 Manual refresh triggered')
    const fetchHubSpotAnalytics = async () => {
      try {
        setAnalyticsStatsLoading(true)
        
        console.log('🔄 Force refreshing HubSpot analytics...')
        
        const response = await supabaseAPI.getHubSpotAnalytics({
          dateFrom: analyticsDateFrom || undefined,
          dateTo: analyticsDateTo || undefined,
          refresh: true
        })
        
        if (response.success) {
          const analyticsData = response.data.map((item: any) => {
            const template = analyticsStatsTemplate.find(t => t.key === item.key)
            
            const data = item.data || []
            
            return {
              ...template,
              value: item.value,
              delta: '0%', // No percentages
              data: item.data
            }
          })
          
          setAnalyticsStats(analyticsData)
          setAnalyticsMetadata(response.metadata)
          console.log('✅ HubSpot analytics refreshed successfully:', analyticsData.map((d: any) => ({
            key: d.key,
            value: d.value,
            dataPoints: d.data?.length || 0,
            lastDataPoint: d.data && d.data.length > 0 ? d.data[d.data.length - 1] : null
          })))
          
          console.log('🔍 Manual Refresh - Advanced Negotiations Debug:', {
            apiResponse: response.data.find((item: any) => item.key === 'advanced_negotiations'),
            displayValue: analyticsData.find((d: any) => d.key === 'advanced_negotiations')?.value,
            metadata: response.metadata
          })
        }
      } catch (error) {
        console.error('❌ Error refreshing HubSpot analytics:', error)
      } finally {
        setAnalyticsStatsLoading(false)
      }
    }

    fetchHubSpotAnalytics()
  }

  // Manual refresh function for Hours Lost
  const handleHoursLostRefresh = () => {
    console.log('🔄 Manual Hours Lost refresh triggered with filters:', { 
      daysLostDateFrom, 
      daysLostDateTo,
      daysLostUserFilter,
      daysLostModuleFilter 
    })
    
    // Trigger re-fetch by updating a non-filter state to force useEffect re-run
    setDaysLostLoading(true)
    
    // Use a timeout to allow the loading state to be set first
    setTimeout(() => {
      setDaysLostUserFilter(prev => prev) // This will trigger the useEffect
    }, 10)
  }

  // Reset function for Hours Lost
  const handleHoursLostReset = () => {
    console.log('🔄 Hours Lost reset triggered - clearing all filters')
    setDaysLostDateFrom('')
    setDaysLostDateTo('')
    setDaysLostUserFilter('All')
    setDaysLostModuleFilter('All')
    
    // Trigger refresh with cleared filters
    setTimeout(() => {
      setDaysLostLoading(true)
      setDaysLostUserFilter('All') // This will trigger the useEffect
    }, 10)
  }

  // Manual refresh function for Forms
  const handleFormsRefresh = () => {
    console.log('🔄 Manual Forms refresh triggered with filters:', { 
      formsDateFrom, 
      formsDateTo,
      formsModuleFilter,
      formsPersonFilter 
    })
    
    // Trigger re-calculation by updating a non-filter state to force useEffect re-run
    setFormsStatsLoading(true)
    
    // Use a timeout to allow the loading state to be set first
    setTimeout(() => {
      setFormsModuleFilter(prev => prev) // This will trigger the useEffect
    }, 10)
  }

  // Reset function for Forms
  const handleFormsReset = () => {
    console.log('🔄 Forms reset triggered - clearing all filters')
    setFormsDateFrom('')
    setFormsDateTo('')
    setFormsModuleFilter('All')
    setFormsPersonFilter('All')
    
    // Trigger refresh with cleared filters
    setTimeout(() => {
      setFormsStatsLoading(true)
      setFormsModuleFilter('All') // This will trigger the useEffect
    }, 10)
  }

  // Set days lost data directly from the smart-filtered allDaysLostData
  useEffect(() => {
    setDaysLostData(allDaysLostData)
  }, [allDaysLostData])

  // Filter focused forms when focused stat or focusedForms change
  useEffect(() => {
    const filterFocusedForms = async () => {
      if (!focusedStat) {
        setFilteredFocusedForms([])
        return
      }

      setFocusedFormsFiltering(true)
      
      const isReasonStat = reasons.some(r => r.key === focusedStat.key)
      
      if (isReasonStat) {
        // For days lost metrics, filter to only show forms that have data for the specific reason
        const reasonKey = focusedStat.key as 'weather' | 'technical' | 'other'
        const formsWithReasonData = Array.from(formsByReason.current[reasonKey] || [])
        const filtered = focusedForms.filter((form: any) => 
          formsWithReasonData.includes(form.id)
        )
        setFilteredFocusedForms(filtered)
      } else {
        // For Forms metrics (confirmed, in progress, overdue), filter by status
        const filtered = await filterFormsByStatus(focusedForms, focusedStat.key)
        setFilteredFocusedForms(filtered)
      }
      
      setFocusedFormsFiltering(false)
    }

    filterFocusedForms()
  }, [focusedStat, focusedForms, formsByReason])

  // Helper to get reason key from stat label
  const getReasonKey = (label: string) => {
    const found = reasons.find(r => r.label === label)
    return found ? found.key : 'other'
  }

  // Helper to format the current time period being displayed based on actual data
  const formatTimePeriod = (dateFromFilter: string, dateToFilter: string, actualData: any) => {
    // If filters are applied, show filter range
    if (dateFromFilter || dateToFilter) {
      const fromDate = dateFromFilter
      const toDate = dateToFilter
      
      const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-GB', { 
          month: 'short', 
          year: 'numeric' 
        })
      }
      
      const fromFormatted = formatDate(fromDate)
      const toFormatted = formatDate(toDate)
      
      if (fromFormatted && toFormatted) {
        return `${fromFormatted} - ${toFormatted}`
      } else if (fromFormatted) {
        return `From ${fromFormatted}`
      } else if (toFormatted) {
        return `Until ${toFormatted}`
      }
    }
    
    // Otherwise, show actual data range
    if (actualData && Object.values(actualData).some((arr: any) => arr.length > 0)) {
      const allDataPoints = Object.values(actualData).flat() as any[]
      const validPoints = allDataPoints.filter(point => point && point.month && point.name)
      
      if (validPoints.length > 0) {
        const sortedPoints = validPoints.sort((a, b) => a.month.localeCompare(b.month))
        const firstPoint = sortedPoints[0]
        const lastPoint = sortedPoints[sortedPoints.length - 1]
        
        return firstPoint.name === lastPoint.name 
          ? firstPoint.name 
          : `${firstPoint.name} - ${lastPoint.name}`
      }
    }
    
    return 'Last 12 months'
  }

  const handleChartClick = async (stat: any, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault()
    const chart = e.currentTarget.querySelector('.recharts-wrapper')
    if (!chart) return
    
    const rect = chart.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const xPercent = x / rect.width
    const yPercent = y / rect.height
    
    const data = stat.data || []
    const dataIndex = Math.round(xPercent * (data.length - 1))
    const dataPoint = data[dataIndex]
    
    setSidebarLoading(true)
    setSidebarError(null)
    setDrawerData({ stat, dataPoint })
    setDrawerOpen(true)
    
    try {
      // Handle both days lost charts and forms stats charts
      if (stat.key === 'confirmed' || stat.key === 'in_progress' || stat.key === 'overdue') {
        // Forms stats chart - show relevant forms based on status AND month
        const monthStr = dataPoint?.month || dataPoint?.name
        const actualCount = dataPoint?.value || 0
        
        // If count is 0, show no forms
        if (actualCount === 0) {
          setSidebarData([])
          return
        }
        
        // Filter forms by status AND specific month
        const statusForms = await filterFormsByStatusAndMonth(forms, stat.key, monthStr)
        
        const details = statusForms.slice(0, 15).map((form, index) => ({
          description: form.title || 'Untitled Form',
          details: `${stat.label} - ${monthStr ? `for ${monthStr}` : 'Current period'} (${index + 1} of ${Math.min(statusForms.length, actualCount)})`,
          form,
          value: 1,
        }))
        
        setSidebarData(details)
      } else {
        // Days lost chart - existing logic but update to hours
        const reasonKey = getReasonKey(stat.label)
        const monthStr = dataPoint?.month
        const formTotals = sidebarFormsData?.[reasonKey]?.[monthStr] || {}
        const formIds = Object.keys(formTotals)
        
        const details = formIds.map(formId => {
          const form = formMap.current[formId]
          return {
            description: form?.description || 'Unknown Form',
            details: `${formTotals[formId]} hours lost in ${monthStr}`,
            form,
            hours: formTotals[formId],
          }
        })
        
        setSidebarData(details)
      }
    } catch (error) {
      setSidebarError('Failed to load forms data')
    } finally {
      setSidebarLoading(false)
    }
  }

  // Enhanced tooltip for Hours Lost charts
  const DaysLostTooltip = ({ active, payload, label, stat }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const currentValue = data.value
      const formsCount = data.formsCount || 0
      
      // Find previous month's value for percentage calculation
      const currentIndex = stat?.data?.findIndex((d: any) => d.name === label) || 0
      const previousValue = currentIndex > 0 ? (stat?.data?.[currentIndex - 1]?.value || 0) : 0
      const deltaValue = currentValue - previousValue
      const deltaPercent = previousValue > 0 ? ((deltaValue / previousValue) * 100).toFixed(1) : '0.0'
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg min-w-[200px]">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-sm text-gray-800 font-medium">
            {currentValue} hours lost ({formsCount} forms)
          </p>
          {previousValue > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600">
                Previous month: {previousValue} hours
              </p>
              <p className="text-xs text-gray-600">
                Change: {deltaValue >= 0 ? '+' : ''}{deltaValue} hours
              </p>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  // Wrapper component to pass stat context to Hours Lost tooltip
  const DaysLostTooltipWrapper = (stat: any) => (props: any) => <DaysLostTooltip {...props} stat={stat} />

  // Enhanced tooltip for Forms Stats charts
  const FormsStatsTooltip = ({ active, payload, label, stat }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const currentValue = data.value
      
      // Find previous month's value for percentage calculation
      const currentIndex = stat?.data?.findIndex((d: any) => d.name === label) || 0
      const previousValue = currentIndex > 0 ? (stat?.data?.[currentIndex - 1]?.value || 0) : 0
      const deltaValue = currentValue - previousValue
      const deltaPercent = previousValue > 0 ? ((deltaValue / previousValue) * 100).toFixed(1) : '0.0'
      
      let metricDescription = ''
      if (stat?.key === 'confirmed') {
        metricDescription = 'forms completed on time'
      } else if (stat?.key === 'in_progress') {
        metricDescription = 'forms pending (not overdue)'
      } else if (stat?.key === 'overdue') {
        metricDescription = 'forms past due date'
      }
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg min-w-[200px]">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-sm text-gray-800 font-medium">
            {currentValue} {metricDescription}
          </p>
          {previousValue > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600">
                Previous month: {previousValue}
              </p>
              <p className="text-xs text-gray-600">
                Change: {deltaValue >= 0 ? '+' : ''}{deltaValue}
              </p>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  // Wrapper component to pass stat context to tooltip
  const FormsTooltipWrapper = (stat: any) => (props: any) => <FormsStatsTooltip {...props} stat={stat} />

  const handleChartMouseMove = (stat: any, e: any) => {
    if (!e || !e.activeLabel) {
      console.log('🚫 No activeLabel - clearing hover');
      setLastHovered(null)
      return
    }
    const data = stat.data || []
    const dataPoint = getNearestDataPoint(data, d => d.name, e.activeLabel)
    console.log(`🎯 HOVER: ${stat.key} -> ${e.activeLabel} (${dataPoint?.value})`);
    setLastHovered({ stat, dataPoint, isActive: true })
  }

  const handleChartMouseLeave = () => {
    console.log('🚶 Mouse LEFT chart - clearing hover state');
    setLastHovered(null)
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false)
        setFocusedStat(null)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  // Function to filter forms by their status AND specific month
  const filterFormsByStatusAndMonth = async (forms: any[], statusKey: string, monthStr?: string) => {
    if (!forms || forms.length === 0) return []
    
    try {
      // Get all form responses to determine status
      const { data: responses, error: responsesError } = await supabase
        .from('form_responses')
        .select('form_id, respondent_id, submitted_at')
      
      if (responsesError) {
        console.error('Error fetching responses for status filtering:', responsesError)
        return forms // Return all forms if we can't filter
      }

      const today = new Date().toISOString().split('T')[0]
      const filteredForms: any[] = []

      for (const form of forms) {
        const formUsers = form.metadata?.users || []
        const dueDate = form.settings?.due_date
        
        // Skip if month filtering is requested and form doesn't match
        if (monthStr) {
          // Convert display month (e.g., "Oct 24") to date format (e.g., "2024-10")
          const formMonth = form.created_at?.slice(0, 7) || dueDate?.slice(0, 7)
          const targetMonth = convertDisplayMonthToDate(monthStr)
          if (formMonth !== targetMonth) continue
        }

        for (const formUser of formUsers) {
          const userResponse = responses?.find((r: any) => 
            r.form_id === form.id && r.respondent_id === formUser.id
          )

          let shouldInclude = false

          if (statusKey === 'confirmed') {
            // Completed on time (submitted before or on due date)
            if (userResponse && dueDate && userResponse.submitted_at) {
              const submittedDate = userResponse.submitted_at.split('T')[0]
              if (submittedDate <= dueDate) {
                shouldInclude = true
              }
            }
          } else if (statusKey === 'in_progress') {
            // Currently pending (no response and not overdue yet)
            if (!userResponse && dueDate && dueDate >= today) {
              shouldInclude = true
            }
          } else if (statusKey === 'overdue') {
            // Overdue (no response and past due date)
            if (!userResponse && dueDate && dueDate < today) {
              shouldInclude = true
            }
          }

          // Add form once per matching status (avoid duplicates)
          if (shouldInclude && !filteredForms.some(f => f.id === form.id)) {
            filteredForms.push(form)
            break // Stop checking other users for this form
          }
        }
      }

      return filteredForms
    } catch (error) {
      console.error('Error in filterFormsByStatusAndMonth:', error)
      return forms // Return all forms if filtering fails
    }
  }

  // Helper function to convert display month to date format
  const convertDisplayMonthToDate = (displayMonth: string): string => {
    // Convert "Oct 24" to "2024-10", "Jan 25" to "2025-01", etc.
    const [monthName, year] = displayMonth.split(' ')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthIndex = monthNames.indexOf(monthName)
    const fullYear = year.length === 2 ? `20${year}` : year
    const monthNumber = (monthIndex + 1).toString().padStart(2, '0')
    return `${fullYear}-${monthNumber}`
  }

  // Function to filter forms by their status (confirmed, in progress, overdue)
  const filterFormsByStatus = async (forms: any[], statusKey: string) => {
    if (!forms || forms.length === 0) return []
    
    try {
      // Get all form responses to determine status
      const { data: responses, error: responsesError } = await supabase
        .from('form_responses')
        .select('form_id, respondent_id, submitted_at')
      
      if (responsesError) {
        console.error('Error fetching responses for status filtering:', responsesError)
        return forms // Return all forms if we can't filter
      }

      const today = new Date().toISOString().split('T')[0]
      const filteredForms: any[] = []

      for (const form of forms) {
        const formUsers = form.metadata?.users || []
        const dueDate = form.settings?.due_date

        for (const formUser of formUsers) {
          const userResponse = responses?.find((r: any) => 
            r.form_id === form.id && r.respondent_id === formUser.id
          )

          let shouldInclude = false

          if (statusKey === 'confirmed') {
            // Completed on time (submitted before or on due date)
            if (userResponse && dueDate && userResponse.submitted_at) {
              const submittedDate = userResponse.submitted_at.split('T')[0]
              if (submittedDate <= dueDate) {
                shouldInclude = true
              }
            }
          } else if (statusKey === 'in_progress') {
            // Currently pending (no response and not overdue yet)
            if (!userResponse && dueDate && dueDate >= today) {
              shouldInclude = true
            }
          } else if (statusKey === 'overdue') {
            // Overdue (no response and past due date)
            if (!userResponse && dueDate && dueDate < today) {
              shouldInclude = true
            }
          }

          // Add form once per matching status (avoid duplicates)
          if (shouldInclude && !filteredForms.some(f => f.id === form.id)) {
            filteredForms.push(form)
            break // Stop checking other users for this form
          }
        }
      }

      return filteredForms
    } catch (error) {
      console.error('Error in filterFormsByStatus:', error)
      return forms // Return all forms if filtering fails
    }
  }

  const renderFocusedView = () => {
    if (!focusedStat) return null
    
    // Use the filtered forms from state (handled by useEffect)
    const totalForms = filteredFocusedForms.length
    
    // Use the properly sorted data from the top-level hook
    const sortedFilteredForms = dueDateSort.sortedData.filter((form: any) => 
      filteredFocusedForms.some((filtered: any) => filtered.id === form.id)
    )

    // Pagination logic for focused view - use sorted data
    const focusedTotalPages = Math.ceil(sortedFilteredForms.length / focusedItemsPerPage)
    const focusedStartIndex = (focusedCurrentPage - 1) * focusedItemsPerPage
    const focusedEndIndex = focusedStartIndex + focusedItemsPerPage
    const paginatedFocusedForms = sortedFilteredForms.slice(focusedStartIndex, focusedEndIndex)
    
    return (
      <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
        <div className="space-y-3 sm:space-y-6">
          {/* Back Button - Enhanced for mobile */}
          <div className="flex items-center mb-3 sm:mb-4">
            <button
              onClick={() => setFocusedStat(null)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 font-inter text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Analytics
            </button>
          </div>

          {/* Chart Section - Enhanced spacing */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4 sm:gap-0">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold font-inter">{focusedStat?.label}</h2>
                <p className="text-sm text-gray-500 font-inter mt-1">Detailed analytics view</p>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {focusedStat?.value || '0'}
              </div>
            </div>
            
            <div className="h-48 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={focusedStat?.data || []}>
                  <defs>
                    <linearGradient id="focusedArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={focusedStat?.stroke || '#FF6551'} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={focusedStat?.stroke || '#FF6551'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#666' }} 
                    axisLine={false}
                    interval="preserveStartEnd"
                    height={25}
                    tickMargin={5}
                    angle={0}
                  />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={focusedStat?.stroke || '#FF6551'} 
                    fill="url(#focusedArea)" 
                    strokeWidth={2} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Filters - Mobile responsive with drawer */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
            {/* Mobile filter button */}
            <div className="sm:hidden mb-4">
              <button
                onClick={() => setFocusedFilterDrawerOpen(true)}
                className="flex items-center gap-2 w-full sm:w-auto bg-white border border-[#E5E7EB] text-gray-700 font-medium rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-base">Filters</span>
                {(focusedModuleFilter !== 'All' || focusedPersonFilter !== 'All' || focusedDateFrom || focusedDateTo || focusedSearchTerm) && (
                  <span className="bg-[#FF6551] text-white text-xs rounded-full px-2 py-0.5 ml-1">
                    {[focusedModuleFilter !== 'All', focusedPersonFilter !== 'All', focusedDateFrom, focusedDateTo, focusedSearchTerm].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {/* Desktop filter controls */}
            <div className="hidden sm:flex flex-wrap gap-3">
              {/* Person Filter */}
              <select
                value={focusedPersonFilter}
                onChange={(e) => setFocusedPersonFilter(e.target.value)}
                className="w-[180px] h-[36px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] focus:outline-none"
              >
                <option value="All">Persons</option>
                {focusedAvailableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name && user.last_name 
                      ? `${user.first_name} ${user.last_name}`
                      : user.email
                    }
                  </option>
                ))}
              </select>

              {/* Module Filter */}
              <select
                value={focusedModuleFilter}
                onChange={(e) => setFocusedModuleFilter(e.target.value)}
                className="w-[160px] h-[36px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] focus:outline-none"
              >
                <option value="All">Module</option>
                {focusedAvailableModules.map(module => (
                  <option key={module} value={module}>{module}</option>
                ))}
              </select>

              {/* Date From */}
              <input
                type="date"
                value={focusedDateFrom}
                onChange={(e) => setFocusedDateFrom(e.target.value)}
                className="h-[36px] w-[140px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] focus:outline-none"
              />

              {/* Date To */}
              <input
                type="date"
                value={focusedDateTo}
                onChange={(e) => setFocusedDateTo(e.target.value)}
                className="h-[36px] w-[140px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] focus:outline-none"
              />

              {/* Search */}
              <input
                type="text"
                placeholder="Search"
                value={focusedSearchTerm}
                onChange={(e) => setFocusedSearchTerm(e.target.value)}
                className="h-[36px] min-w-[200px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none"
              />
            </div>
          </div>

          {/* Forms Table - Mobile responsive with horizontal scroll */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Table header with count */}
            <div className="px-4 py-4 sm:px-6 sm:py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 font-inter">
                Forms ({filteredFocusedForms.length})
              </h3>
              <p className="text-sm text-gray-500 font-inter mt-1">
                {focusedStat?.label ? `Showing forms for ${focusedStat.label.toLowerCase()}` : 'All forms matching filters'}
              </p>
            </div>
            
            {/* Horizontal scroll container */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                      Description
                    </th>
                    <th className="px-4 py-3 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      Site
                    </th>
                    <th className="px-4 py-3 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                      Module
                    </th>
                    <th className="px-4 py-3 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                      Responsible
                    </th>
                    <th 
                      {...dueDateSort.getSortableHeaderProps()}
                      className="px-4 py-3 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>Due</span>
                        {dueDateSort.renderSortIcon()}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {focusedFormsLoading || focusedFormsFiltering ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 sm:px-6 sm:py-8 text-center text-gray-500">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF6551] mr-3"></div>
                          {focusedFormsFiltering ? 'Filtering forms...' : 'Loading forms...'}
                        </div>
                      </td>
                    </tr>
                  ) : focusedFormsError ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 sm:px-6 sm:py-8 text-center text-red-500">
                        <div className="flex items-center justify-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Error loading forms: {focusedFormsError}
                        </div>
                      </td>
                    </tr>
                  ) : paginatedFocusedForms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 sm:px-6 sm:py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          No forms found for this metric.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedFocusedForms.map((form: any) => (
                      <tr key={form.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 sm:px-6 sm:py-4 text-sm text-gray-900">
                          <div className="max-w-[200px] sm:max-w-none">
                            <p className="font-medium truncate" title={form.description}>
                              {form.description || 'No description'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 sm:px-6 sm:py-4 text-sm text-gray-500">
                          <div className="max-w-[150px] sm:max-w-none">
                            <p className="truncate" title={form.settings?.site}>
                              {form.settings?.site || '-'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 sm:px-6 sm:py-4 text-sm text-gray-500">
                          {form.settings?.module || '-'}
                        </td>
                        <td className="px-4 py-4 sm:px-6 sm:py-4 text-sm text-gray-500">
                          <div className="max-w-[200px] sm:max-w-none">
                            <p className="truncate" title={
                              Array.isArray(form.metadata?.users) 
                                ? form.metadata.users.map((u: any) => u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email).join(', ')
                                : '-'
                            }>
                              {Array.isArray(form.metadata?.users) 
                                ? form.metadata.users.map((u: any) => u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email).join(', ') 
                                : '-'
                              }
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 sm:px-6 sm:py-4 text-sm text-gray-500">
                          {form.settings?.due_date || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination Controls - Mobile optimized */}
          {filteredFocusedForms.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-sm text-gray-700 order-2 sm:order-1">
                  <span>
                    Showing {focusedStartIndex + 1} to {Math.min(focusedEndIndex, filteredFocusedForms.length)} of {filteredFocusedForms.length} forms
                  </span>
                </div>
                <div className="flex items-center justify-center space-x-2 order-1 sm:order-2">
                  <button
                    onClick={() => setFocusedCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={focusedCurrentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(focusedTotalPages, 5) }, (_, i) => {
                      let page;
                      if (focusedTotalPages <= 5) {
                        page = i + 1;
                      } else if (focusedCurrentPage <= 3) {
                        page = i + 1;
                      } else if (focusedCurrentPage >= focusedTotalPages - 2) {
                        page = focusedTotalPages - 4 + i;
                      } else {
                        page = focusedCurrentPage - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setFocusedCurrentPage(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            focusedCurrentPage === page
                              ? 'bg-[#FF6551] text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setFocusedCurrentPage(prev => Math.min(prev + 1, focusedTotalPages))}
                    disabled={focusedCurrentPage === focusedTotalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filter Drawer for Individual Graph Page */}
          <FilterDrawer
            isOpen={focusedFilterDrawerOpen}
            onClose={() => setFocusedFilterDrawerOpen(false)}
            title="Analytics Filters"
            filters={[
              {
                key: 'module',
                value: focusedModuleFilter,
                onChange: setFocusedModuleFilter,
                type: 'select',
                placeholder: 'Module',
                options: [
                  { value: 'All', label: 'Module' },
                  ...focusedAvailableModules.map(module => ({ value: module, label: module }))
                ]
              },
              {
                key: 'person',
                value: focusedPersonFilter,
                onChange: setFocusedPersonFilter,
                type: 'select',
                placeholder: 'Person',
                options: [
                  { value: 'All', label: 'Persons' },
                  ...focusedAvailableUsers.map(user => ({
                    value: user.id,
                    label: user.first_name && user.last_name 
                      ? `${user.first_name} ${user.last_name}`
                      : user.email
                  }))
                ]
              },
              {
                key: 'dateFrom',
                value: focusedDateFrom,
                onChange: setFocusedDateFrom,
                type: 'date',
                placeholder: 'Date From'
              },
              {
                key: 'dateTo',
                value: focusedDateTo,
                onChange: setFocusedDateTo,
                type: 'date',
                placeholder: 'Date To'
              },
              {
                key: 'search',
                value: focusedSearchTerm,
                onChange: setFocusedSearchTerm,
                type: 'search',
                placeholder: 'Search forms...'
              }
            ]}
            onClearAll={() => {
              setFocusedModuleFilter('All')
              setFocusedPersonFilter('All')
              setFocusedDateFrom('')
              setFocusedDateTo('')
              setFocusedSearchTerm('')
            }}
          />
        </div>
      </div>
    )
  }

  const filteredForms = forms || []

  if (focusedStat) {
    return renderFocusedView()
  }

  const handleChange = (reason: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDaysLost((prev) => ({ ...prev, [reason]: Number(e.target.value) }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Pass JSON to parent or API
  };

return (
  <AdminOnly>
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8" ref={chartContainerRef}>
    {/* Breadcrumb */}
    <div className="text-sm text-gray-400 font-inter mb-2 flex items-center gap-2">
      <span className="text-gray-700 font-medium">Dashboard</span>
      <span>{'>'}</span>
      <span>Analytics</span>
    </div>
    
    {/* Hours Lost Section */}
    <div className="bg-white rounded-2xl p-4 sm:p-6 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 sm:gap-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <h2 className="text-lg sm:text-xl font-semibold font-inter">Hours Lost</h2>
            <span className="bg-[#F2F2F2] text-[#272937] text-xs font-medium font-inter rounded px-3 py-1">
              Total {daysLostLoading ? '...' : Object.values(daysLostData || {}).reduce((acc: number, arr: any) => acc + (arr[arr.length-1]?.value || 0), 0)} hours
            </span>
          </div>
          <p className="text-xs text-gray-500 font-inter">
            {formatTimePeriod(daysLostDateFrom, daysLostDateTo, daysLostData)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile filter button */}
          <button
            onClick={() => setDaysLostFilterDrawerOpen(true)}
            className="sm:hidden flex items-center gap-2 bg-white border border-[#E5E7EB] text-gray-700 font-medium rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-base">Filters</span>
            {(daysLostUserFilter !== 'All' || daysLostModuleFilter !== 'All' || daysLostDateFrom || daysLostDateTo) && (
              <span className="bg-[#FF6551] text-white text-xs rounded-full px-2 py-0.5 ml-1">
                {[daysLostUserFilter !== 'All', daysLostModuleFilter !== 'All', daysLostDateFrom, daysLostDateTo].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Desktop filter controls */}
          <div className="hidden sm:flex gap-3">
            {/* User Filter */}
            <select 
              value={daysLostUserFilter}
              onChange={(e) => setDaysLostUserFilter(e.target.value)}
              className="w-[180px] h-[36px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] focus:outline-none"
            >
              <option value="All">All persons</option>
              {daysLostAvailableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}`
                    : user.email
                  }
                </option>
              ))}
            </select>
            
            {/* Module Filter */}
            <select 
              value={daysLostModuleFilter}
              onChange={(e) => setDaysLostModuleFilter(e.target.value)}
              className="w-[160px] h-[36px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] focus:outline-none"
            >
              <option value="All">All Modules</option>
              {daysLostAvailableModules.map(module => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
            
            {/* Date From */}
            <input 
              type="date" 
              value={daysLostDateFrom}
              onChange={(e) => setDaysLostDateFrom(e.target.value)}
              className="h-[36px] w-[140px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] focus:outline-none" 
            />
            
            {/* Date To */}
            <input 
              type="date"
              value={daysLostDateTo}
              onChange={(e) => setDaysLostDateTo(e.target.value)}
              className="h-[36px] w-[140px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] focus:outline-none" 
            />
            
            {/* Apply Filters Button */}
            <button
              onClick={() => handleHoursLostRefresh()}
              disabled={daysLostLoading}
              className="h-[36px] px-4 rounded-[8px] border border-[#E5E7EB] bg-white text-[#272937] font-medium text-[14px] font-inter hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Apply date filters"
            >
              <svg 
                width="14" 
                height="14" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Apply
            </button>
            
            {/* Reset Button */}
            <button
              onClick={() => handleHoursLostReset()}
              disabled={daysLostLoading}
              className="h-[36px] px-4 rounded-[8px] border border-[#E5E7EB] bg-white text-[#272937] font-medium text-[14px] font-inter hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Reset all filters"
            >
              <svg 
                width="14" 
                height="14" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {(showMoreHoursLost ? reasons : reasons.slice(0, 3)).map((reason, i) => {
          const data = daysLostData?.[reason.key] || []
          // Calculate total for the period instead of just the last value
          const totalValue = data.reduce((sum: number, item: any) => sum + (item.value || 0), 0)
          const totalFormsCount = data.reduce((sum: number, item: any) => sum + (item.formsCount || 0), 0)
          const last = { value: totalValue, formsCount: totalFormsCount }
          
          // console.log(`📊 Hours Lost ${reason.key}: ${totalValue}`);
          return (
            <div key={i} className="bg-[#FFF6F4] rounded-xl p-4 sm:p-6 flex flex-col gap-3 min-h-[200px] sm:min-h-[220px] relative">
              {/* Mini 'view' link */}
              <span
                className="absolute top-3 right-4 text-xs text-gray-400 hover:underline cursor-pointer font-inter"
                onClick={() => setFocusedStat({ ...reason, data: daysLostData?.[reason.key] || [] })}
              >
                view
              </span>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {reason.icon}
                  <span className="text-[15px] font-medium" style={{ color: '#131B33' }}>{reason.label}</span>
                </div>
                <span className="text-[#FF6551]">{/* right icon placeholder */}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[28px] font-semibold" style={{ color: '#131B33' }}>{daysLostLoading ? '...' : last.value}</span>
              </div>
              {/* Recharts AreaChart */}
              <div className="w-full h-36 mt-4"
                ref={i === 0 ? chartContainerRef : undefined}
                onClick={e => data.length > 0 ? handleChartClick({ ...reason, data }, e) : setSidebarError('No data for this period.')}
              >
                {data.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data for this period</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data}
                      margin={{ top: 5, right: 10, left: 0, bottom: 35 }}
                      onMouseMove={e => handleChartMouseMove({ ...reason, data }, e)}
                      onMouseLeave={handleChartMouseLeave}
                    >
                      <defs>
                        <linearGradient id="redArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF6551" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="#FF6551" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                      <Tooltip content={DaysLostTooltipWrapper({ ...reason, data })} />
                      <Area type="monotone" dataKey="value" stroke={reason.color} fill="url(#redArea)" strokeWidth={2} dot={{ r: 4, fill: 'transparent', stroke: 'transparent' }} isAnimationActive={false} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#666' }} 
                        axisLine={false}
                        interval="preserveStartEnd"
                        height={25}
                        tickMargin={5}
                        angle={0}
                      />
                      <YAxis hide />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Show More/Less Toggle */}
      {reasons.length > 3 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setShowMoreHoursLost(!showMoreHoursLost)}
            className="px-6 py-2 bg-[#FF6551] text-white rounded-lg font-inter font-medium hover:bg-[#E55A4A] transition-colors"
          >
            {showMoreHoursLost ? 'Show Less' : 'Show More'}
          </button>
        </div>
      )}
    </div>
    
    {/* Forms Section */}
    <div className="bg-white rounded-2xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 sm:gap-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <h2 className="text-lg sm:text-xl font-semibold font-inter">Forms</h2>
            <span className="bg-[#F2F2F2] text-[#272937] text-xs font-medium font-inter rounded px-3 py-1">
              Total {formsTotal} forms
            </span>
          </div>
          <p className="text-xs text-gray-500 font-inter">
            {formatTimePeriod(formsDateFrom, formsDateTo, { forms: formsStats.map(s => s.data).flat() })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile filter button */}
          <button
            onClick={() => setFormsFilterDrawerOpen(true)}
            className="sm:hidden flex items-center gap-2 bg-white border border-[#E5E7EB] text-gray-700 font-medium rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-base">Filters</span>
            {(formsModuleFilter !== 'All' || formsPersonFilter !== 'All' || formsDateFrom || formsDateTo) && (
              <span className="bg-[#FF6551] text-white text-xs rounded-full px-2 py-0.5 ml-1">
                {[formsModuleFilter !== 'All', formsPersonFilter !== 'All', formsDateFrom, formsDateTo].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Desktop filter controls */}
          <div className="hidden sm:flex gap-3">
            {/* Person Filter */}
            <select 
              value={formsPersonFilter}
              onChange={(e) => setFormsPersonFilter(e.target.value)}
              className="w-[200px] h-[36px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] focus:outline-none"
            >
              <option value="All">All Persons</option>
              {formsAvailableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}`
                    : user.email
                  }
                </option>
              ))}
            </select>
            
            {/* Module Filter */}
            <select 
              value={formsModuleFilter}
              onChange={(e) => setFormsModuleFilter(e.target.value)}
              className="w-[160px] h-[36px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] focus:outline-none"
            >
              <option value="All">All Modules</option>
              {formsAvailableModules.map(module => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
            
            {/* Date Range */}
            <input 
              type="date" 
              value={formsDateFrom}
              onChange={(e) => setFormsDateFrom(e.target.value)}
              className="h-[36px] w-[140px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] focus:outline-none" 
            />
            <input 
              type="date"
              value={formsDateTo}
              onChange={(e) => setFormsDateTo(e.target.value)}
              className="h-[36px] w-[140px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] focus:outline-none" 
            />
            
            {/* Apply Filters Button */}
            <button
              onClick={() => handleFormsRefresh()}
              disabled={formsStatsLoading}
              className="h-[36px] px-4 rounded-[8px] border border-[#E5E7EB] bg-white text-[#272937] font-medium text-[14px] font-inter hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Apply date filters"
            >
              <svg 
                width="14" 
                height="14" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Apply
            </button>
            
            {/* Reset Button */}
            <button
              onClick={() => handleFormsReset()}
              disabled={formsStatsLoading}
              className="h-[36px] px-4 rounded-[8px] border border-[#E5E7EB] bg-white text-[#272937] font-medium text-[14px] font-inter hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Reset all filters"
            >
              <svg 
                width="14" 
                height="14" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {formsStatsLoading ? (
          // Loading skeleton
          formsStatsTemplate.map((template, i) => (
            <div key={i} className="rounded-xl p-4 sm:p-6 flex flex-col gap-3 min-h-[200px] sm:min-h-[220px] relative animate-pulse" style={{ background: template.chart === 'green' ? '#F8FFF4' : template.chart === 'orange' ? '#FFF9F4' : '#F7F4FF' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {template.icon}
                  <span className="text-[15px] font-medium" style={{ color: '#131B33' }}>{template.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="w-full h-36 mt-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))
        ) : (
          formsStats.map((stat, i) => (
            <div key={i} className="rounded-xl p-4 sm:p-6 flex flex-col gap-3 min-h-[200px] sm:min-h-[220px] relative" style={{ background: stat.chart === 'green' ? '#F8FFF4' : stat.chart === 'orange' ? '#FFF9F4' : '#F7F4FF' }}>
              {/* Mini 'view' link */}
              <span
                className="absolute top-3 right-4 text-xs text-gray-400 hover:underline cursor-pointer font-inter"
                onClick={() => setFocusedStat(stat)}
              >
                view
              </span>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {stat.icon}
                  <span className="text-[15px] font-medium" style={{ color: stat.chart === 'green' ? '#131B33' : stat.chart === 'orange' ? '#131B33' : '#131B33' }}>{stat.label}</span>
                </div>
                <span className={stat.deltaColor}>{/* right icon placeholder */}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[28px] font-semibold" style={{ color: stat.chart === 'green' ? '#131B33' : stat.chart === 'orange' ? '#131B33' : '#131B33' }}>{stat.value}</span>
                {/* Removed percentage display */}
              </div>
              {/* Recharts AreaChart */}
              <div className="w-full h-36 mt-4"
                onClick={e => handleChartClick(stat, e)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stat.data}
                    margin={{ top: 5, right: 10, left: 0, bottom: 35 }}
                    onMouseMove={e => handleChartMouseMove(stat, e)}
                    onMouseLeave={handleChartMouseLeave}
                  >
                    <defs>
                      <linearGradient id="greenArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4FC62B" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#4FC62B" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="orangeArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFB800" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#FFB800" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="purpleArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7B61FF" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#7B61FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: '#666' }} 
                      axisLine={false}
                      interval="preserveStartEnd"
                      height={25}
                      tickMargin={5}
                      angle={0}
                    />
                    <YAxis hide />
                    <Tooltip content={FormsTooltipWrapper(stat)} />
                    <Area type="monotone" dataKey="value" stroke={stat.stroke} fill={stat.fill} strokeWidth={2} dot={{ r: 4, fill: 'transparent', stroke: 'transparent' }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    
    {/* Analytics Section */}
    <div className="bg-white rounded-2xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 sm:gap-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <h2 className="text-lg sm:text-xl font-semibold font-inter">Analytics</h2>
            <span className="bg-[#F2F2F2] text-[#272937] text-xs font-medium font-inter rounded px-3 py-1">
              Performance Metrics
            </span>
          </div>
          <p className="text-xs text-gray-500 font-inter">
            Track negotiations and wins over time
            {analyticsMetadata && (
              <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                {analyticsMetadata.granularity || 'monthly'} view • {analyticsMetadata.historicalDataPoints || 0} data points
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile filter button */}
          <button
            onClick={() => setAnalyticsFilterDrawerOpen(true)}
            className="sm:hidden flex items-center gap-2 bg-white border border-[#E5E7EB] text-gray-700 font-medium rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-base">Filters</span>
            {(analyticsDateFrom || analyticsDateTo) && (
              <span className="bg-[#FF6551] text-white text-xs rounded-full px-2 py-0.5 ml-1">
                {[analyticsDateFrom, analyticsDateTo].filter(Boolean).length}
              </span>
            )}
          </button>
          {(analyticsDateFrom || analyticsDateTo) && (
            <button
              onClick={() => {
                setAnalyticsDateFrom('');
                setAnalyticsDateTo('');
                console.log('🔄 Cleared analytics date filters');
              }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Clear Filters
            </button>
          )}

          {/* Desktop filter controls */}
          <div className="hidden sm:flex gap-3">
            {/* Date Range */}
            <input 
              type="date" 
              value={analyticsDateFrom}
              onChange={(e) => setAnalyticsDateFrom(e.target.value)}
              placeholder="From date"
              className="h-[36px] w-[140px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] focus:outline-none" 
            />
            <input 
              type="date"
              value={analyticsDateTo}
              onChange={(e) => setAnalyticsDateTo(e.target.value)}
              placeholder="To date"
              className="h-[36px] w-[140px] rounded-[8px] border border-[#E5E7EB] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] focus:outline-none" 
            />
            
            {/* Apply Filters Button */}
            <button
              onClick={() => handleAnalyticsRefresh()}
              disabled={analyticsStatsLoading}
              className="h-[36px] px-4 rounded-[8px] border border-[#E5E7EB] bg-white text-[#272937] font-medium text-[14px] font-inter hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Apply date filters"
            >
              <svg 
                width="14" 
                height="14" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Apply
            </button>
            
            {/* Refresh Button */}
            <button
              onClick={handleAnalyticsRefresh}
              disabled={analyticsStatsLoading}
              className="h-[36px] px-4 rounded-[8px] border border-[#E5E7EB] bg-white text-[#272937] font-medium text-[14px] font-inter hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Refresh HubSpot data"
            >
              <svg 
                width="14" 
                height="14" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                viewBox="0 0 24 24"
                className={analyticsStatsLoading ? 'animate-spin' : ''}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {analyticsStatsLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {analyticsStatsLoading ? (
          // Loading skeleton
          analyticsStatsTemplate.map((template, i) => (
            <div key={i} className="rounded-xl p-4 sm:p-6 flex flex-col gap-3 min-h-[200px] sm:min-h-[220px] relative animate-pulse" style={{ background: template.chart === 'blue' ? '#F0F7FF' : '#F0FDF4' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {template.icon}
                  <span className="text-[15px] font-medium" style={{ color: '#131B33' }}>{template.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="w-full h-36 mt-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))
        ) : (
          analyticsStats.map((stat, i) => {
            // Clean state
            
            return (
            <div key={i} className="rounded-xl p-4 sm:p-6 flex flex-col gap-3 min-h-[200px] sm:min-h-[220px] relative" style={{ background: stat.chart === 'blue' ? '#F0F7FF' : '#F0FDF4' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {stat.icon}
                  <span className="text-[15px] font-medium" style={{ color: '#131B33' }}>{stat.label}</span>
                </div>
                <span className={stat.deltaColor}>{/* right icon placeholder */}</span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-[28px] font-semibold" style={{ color: '#131B33' }}>
                  {(() => {
                    // Always show the main stat value (no hover interference)
                    return stat.value;
                  })()
                  }
                </span>
                <span className="text-xs text-gray-500">
                  {(() => {
                    // Show the actual last data point date from the chart data
                    const lastDataPoint = stat.data && stat.data.length > 0 ? stat.data[stat.data.length - 1] : null;
                    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                    const endDate = lastDataPoint ? lastDataPoint.name : today;
                    
                    // Debug logging for date display issue
                    if (stat.key === 'advanced_negotiations') {
                      console.log('🔍 Date Display Debug:', {
                        analyticsDateFrom,
                        analyticsDateTo,
                        hasDateFilters: !!(analyticsDateFrom || analyticsDateTo),
                        lastDataPoint,
                        today,
                        endDate,
                        willShow: (analyticsDateTo || analyticsDateFrom) ? `as of ${endDate}` : `as of today`
                      });
                    }
                    
                    if (analyticsDateTo || analyticsDateFrom) {
                      return `as of ${endDate}`;
                    } else {
                      return `as of today`;
                    }
                  })()
                  }
                </span>
              </div>
              {/* Recharts AreaChart */}
              <div className="w-full h-36 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stat.data}
                    margin={{ top: 5, right: 10, left: 0, bottom: 35 }}
                    onMouseMove={e => handleChartMouseMove(stat, e)}
                    onMouseLeave={handleChartMouseLeave}
                  >
                    <defs>
                      <linearGradient id="blueArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="successArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: '#666' }} 
                      axisLine={false}
                      interval="preserveStartEnd"
                      height={25}
                      tickMargin={5}
                      angle={0}
                    />
                    <YAxis hide />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke={stat.stroke} fill={stat.fill} strokeWidth={2} dot={{ r: 4, fill: 'transparent', stroke: 'transparent' }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
    
    {/* Drawer/Modal for Learn More */}
    {drawerOpen && (
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black bg-opacity-20 transition-opacity duration-300"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close sidebar"
          tabIndex={0}
        />
        {/* Sidebar */}
        <div
          className={
            `relative w-full sm:w-[400px] max-w-sm h-full bg-white shadow-2xl rounded-l-2xl p-4 sm:p-6 overflow-y-auto flex flex-col
            transform transition-transform duration-700 ease-in-out
            translate-x-0`
          }
          onClick={e => e.stopPropagation()}
        >
          {sidebarLoading ? (
            <div className="text-center text-gray-400">Loading...</div>
          ) : sidebarError ? (
            <div className="text-center text-red-500">{sidebarError}</div>
          ) : sidebarData ? (
            <>
              <h3 className="text-lg font-semibold mb-4">
                {drawerData?.stat?.label || 'Details'}
              </h3>
              <div className="space-y-2">
                {Array.isArray(sidebarData) ? (
                  sidebarData.map((item: any, index: number) => (
                    <div key={index} className="p-3 bg-gray-50 rounded">
                      <div className="font-medium">{item.description}</div>
                      <div className="text-sm text-gray-600">{item.details}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-gray-50 rounded">
                    <pre className="text-sm">{JSON.stringify(sidebarData, null, 2)}</pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400">No data available</div>
          )}
        </div>
      </div>
    )}

    {/* Filter Drawers */}
    
    {/* Hours Lost Filter Drawer */}
    <FilterDrawer
      isOpen={daysLostFilterDrawerOpen}
      onClose={() => setDaysLostFilterDrawerOpen(false)}
      title="Hours Lost Filters"
      filters={[
        {
          key: 'user',
          value: daysLostUserFilter,
          onChange: setDaysLostUserFilter,
          type: 'select',
          placeholder: 'User',
          options: [
            { value: 'All', label: 'All persons' },
            ...daysLostAvailableUsers.map(user => ({
              value: user.id,
              label: user.first_name && user.last_name 
                ? `${user.first_name} ${user.last_name}`
                : user.email
            }))
          ]
        },
        {
          key: 'module',
          value: daysLostModuleFilter,
          onChange: setDaysLostModuleFilter,
          type: 'select',
          placeholder: 'Module',
          options: [
            { value: 'All', label: 'All Modules' },
            ...daysLostAvailableModules.map(module => ({ value: module, label: module }))
          ]
        },
        {
          key: 'dateFrom',
          value: daysLostDateFrom,
          onChange: setDaysLostDateFrom,
          type: 'date',
          placeholder: 'Date From'
        },
        {
          key: 'dateTo',
          value: daysLostDateTo,
          onChange: setDaysLostDateTo,
          type: 'date',
          placeholder: 'Date To'
        }
      ]}
      onClearAll={() => {
        setDaysLostUserFilter('All')
        setDaysLostModuleFilter('All')
        setDaysLostDateFrom('')
        setDaysLostDateTo('')
      }}
    />

    {/* Forms Filter Drawer */}
    <FilterDrawer
      isOpen={formsFilterDrawerOpen}
      onClose={() => setFormsFilterDrawerOpen(false)}
      title="Form Filters"
      filters={[
        {
          key: 'person',
          value: formsPersonFilter,
          onChange: setFormsPersonFilter,
          type: 'select',
          placeholder: 'Person',
          options: [
            { value: 'All', label: 'All Persons' },
            ...formsAvailableUsers.map(user => ({
              value: user.id,
              label: user.first_name && user.last_name 
                ? `${user.first_name} ${user.last_name}`
                : user.email
            }))
          ]
        },
        {
          key: 'module',
          value: formsModuleFilter,
          onChange: setFormsModuleFilter,
          type: 'select',
          placeholder: 'Module',
          options: [
            { value: 'All', label: 'All Modules' },
            ...formsAvailableModules.map(module => ({ value: module, label: module }))
          ]
        },
        {
          key: 'dateFrom',
          value: formsDateFrom,
          onChange: setFormsDateFrom,
          type: 'date',
          placeholder: 'Date From'
        },
        {
          key: 'dateTo',
          value: formsDateTo,
          onChange: setFormsDateTo,
          type: 'date',
          placeholder: 'Date To'
        }
      ]}
      onClearAll={() => {
        setFormsModuleFilter('All')
        setFormsPersonFilter('All')
        setFormsDateFrom('')
        setFormsDateTo('')
      }}
    />

    {/* Analytics Filter Drawer */}
    <FilterDrawer
      isOpen={analyticsFilterDrawerOpen}
      onClose={() => setAnalyticsFilterDrawerOpen(false)}
      title="Date Range Filters"
      filters={[
        {
          key: 'dateFrom',
          value: analyticsDateFrom,
          onChange: setAnalyticsDateFrom,
          type: 'date',
          placeholder: 'From Date'
        },
        {
          key: 'dateTo',
          value: analyticsDateTo,
          onChange: setAnalyticsDateTo,
          type: 'date',
          placeholder: 'To Date'
        }
      ]}
      onClearAll={() => {
        setAnalyticsDateFrom('')
        setAnalyticsDateTo('')
      }}
        />  
    </div>
  </AdminOnly>
)
}