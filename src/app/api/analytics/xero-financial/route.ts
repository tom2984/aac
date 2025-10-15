import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to allow request.headers access
export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { XeroAPIClient } from '@/lib/xero-api';

function getSupabaseClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  // Regular client for auth
  const supabase = createClient(supabaseUrl, anonKey);
  
  // Service role client for admin operations (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  return { supabase, supabaseAdmin };
}

function getXeroClient(supabaseAdmin: any) {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing XERO_CLIENT_ID or XERO_CLIENT_SECRET environment variables');
  }
  
  return new XeroAPIClient(clientId, clientSecret, supabaseAdmin);
}

// Generate weekly data for detailed date filtering (similar to HubSpot implementation)
async function generateWeeklyFinancialData(
  xeroClient: XeroAPIClient,
  startDate: Date,
  endDate: Date
) {
  console.log('📅 Generating weekly financial data from', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
  
  const weeklyData = [];
  const currentDate = new Date(startDate);
  
  let weekNumber = 1;
  
  while (currentDate <= endDate) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Ensure week end doesn't exceed the selected end date
    if (weekEnd > endDate) {
      weekEnd.setTime(endDate.getTime());
    }
    
    console.log(`📅 Week ${weekNumber}: ${weekStart.toISOString().split('T')[0]} -> ${weekEnd.toISOString().split('T')[0]}`);
    
    try {
      // Get P&L data for this week
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      
      const reportData = await xeroClient.getProfitAndLossReport(weekStartStr, weekEndStr);
      const metrics = xeroClient.extractFinancialMetrics(reportData);
      
      const grossMarginPercentage = metrics.revenue > 0 
        ? ((metrics.revenue - metrics.cogs) / metrics.revenue) * 100 
        : 0;

      // Create a representative name for weeks that include the end date
      let weekName;
      const includesEndDate = weekEnd >= endDate && weekStart <= endDate;
      
      if (includesEndDate) {
        weekName = `${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
        console.log(`🎯 Week ${weekNumber} includes end date - labeled as "${weekName}"`);
      } else {
        weekName = `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
      }
      
      weeklyData.push({
        name: weekName,
        month: weekStart.toISOString().slice(0, 7),
        avgTurnover: metrics.revenue,
        grossMargin: grossMarginPercentage,
        materialCost: metrics.materialCosts,
        subcontractorUse: metrics.subcontractorCosts,
        weekStart: weekStartStr,
        weekEnd: weekEndStr
      });
      
    } catch (error) {
      console.warn('⚠️ Failed to fetch weekly financial data for week', weekNumber, ':', error instanceof Error ? error.message : String(error));
      
      // Add placeholder data
      let weekName;
      const includesEndDate = weekEnd >= endDate && currentDate <= endDate;
      
      if (includesEndDate) {
        weekName = `${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
      } else {
        weekName = `${currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
      }
      
      weeklyData.push({
        name: weekName,
        month: currentDate.toISOString().slice(0, 7),
        avgTurnover: 0,
        grossMargin: 0,
        materialCost: 0,
        subcontractorUse: 0,
        weekStart: currentDate.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0]
      });
    }
    
    // Move to next week (7 days from week start)
    currentDate.setDate(currentDate.getDate() + 7);
    weekNumber++;
    
    // If the week we just processed covered the end date, we can stop
    if (weekEnd >= endDate) {
      console.log(`🏁 Week generation complete - covered end date ${endDate.toISOString().split('T')[0]}`);
      break;
    }
    
    // Safety check to prevent infinite loops
    if (weekNumber > 20) {
      console.warn('⚠️ Week generation safety break at week', weekNumber);
      break;
    }
    
    // Add delay to respect Xero rate limits
    await new Promise(resolve => setTimeout(resolve, 1100));
  }
  
  console.log('📊 Generated', weeklyData.length, 'weeks of financial data');
  return weeklyData;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting Xero financial analytics API request...');
    
    // Check environment variables first
    console.log('🔍 Checking environment variables...');
    const envCheck = {
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_KEY: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY),
      XERO_CLIENT_ID: !!process.env.XERO_CLIENT_ID,
      XERO_CLIENT_SECRET: !!process.env.XERO_CLIENT_SECRET
    };
    console.log('🔍 Environment variables status:', envCheck);
    
    console.log('🔍 Creating Supabase clients...');
    const { supabase, supabaseAdmin } = getSupabaseClients();
    console.log('🔍 Supabase clients created successfully');
    
    console.log('🔍 Creating Xero client...');
    const xeroClient = getXeroClient(supabaseAdmin);
    console.log('🔍 Xero client created successfully');

    // Get user from Authorization header
    console.log('🔍 Starting authentication check...');
    const authHeader = request.headers.get('authorization')
    let currentUser = null
    let currentUserProfile = null
    
    if (authHeader) {
      console.log('🔍 Found auth header, validating token...');
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError) {
        console.log('❌ Auth error:', authError);
      }
      
      if (!authError && user) {
        console.log('🔍 User authenticated:', user.email);
        currentUser = user
        
        // Get user profile with admin privileges
        console.log('🔍 Fetching user profile...');
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id, role, invited_by, first_name, last_name, email')
          .eq('id', user.id)
          .single()
          
        if (profileError) {
          console.log('❌ Profile fetch error:', profileError);
        } else {
          console.log('🔍 Profile fetched:', { role: profile?.role, email: profile?.email });
        }
          
        currentUserProfile = profile
      }
    }

    // Require authentication for financial analytics data
    if (!currentUser || !currentUserProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 🔒 SECURITY: Only admins can access financial analytics data
    if (currentUserProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('🔒 Financial Analytics API: User', currentUserProfile.email, `(${currentUserProfile.role})`, 'accessing Xero financial data');

    // Get query parameters for filters
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const forceRefresh = searchParams.get('refresh') === 'true';

    console.log('🔄 Fetching Xero financial data with filters:', { 
      dateFrom, 
      dateTo, 
      forceRefresh,
      requestUrl: request.url
    });

    // Check cache freshness first (24-hour cache)
    console.log('🔍 Checking cache for fresh data...');
    const { data: cachedData, error: cacheError } = await supabaseAdmin
      .from('xero_financial_cache')
      .select('*')
      .order('month', { ascending: true });
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Check if we have cached data and if it's fresh (less than 24 hours old)
    const hasFreshCache = cachedData && cachedData.length > 0 && 
      cachedData.some(item => new Date(item.cached_at) > oneDayAgo);
    
    let monthlyFinancialData;
    
    if (hasFreshCache && !forceRefresh) {
      console.log('✅ Using cached financial data (fresh within 24 hours)');
      monthlyFinancialData = cachedData.map(item => ({
        month: item.month,
        name: (() => {
          const date = new Date(item.month + '-01');
          const isCurrentMonth = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
          if (isCurrentMonth) {
            return now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          } else {
            return date.toLocaleString('en-GB', { month: 'short', year: '2-digit' });
          }
        })(),
        avgTurnover: parseFloat(item.avg_turnover || '0'),
        grossMargin: parseFloat(item.gross_margin || '0'),
        materialCost: parseFloat(item.material_cost || '0'),
        subcontractorUse: parseFloat(item.subcontractor_use || '0')
      }));
    } else {
      console.log('🔄 Cache stale or force refresh - fetching fresh data from Xero...');
      
      try {
        const monthlyData = await xeroClient.getMonthlyProfitAndLossData(12);
        monthlyFinancialData = xeroClient.calculateFinancialMetrics(monthlyData);
        console.log('✅ Xero financial data fetched successfully:', monthlyFinancialData.length, 'months');
        
        // Store in cache for next time
        console.log('💾 Updating cache with fresh data...');
        for (const monthData of monthlyFinancialData) {
          await supabaseAdmin
            .from('xero_financial_cache')
            .upsert({
              month: monthData.month,
              avg_turnover: monthData.avgTurnover,
              gross_margin: monthData.grossMargin,
              material_cost: monthData.materialCost,
              subcontractor_use: monthData.subcontractorUse,
              cached_at: now.toISOString(),
              updated_at: now.toISOString()
            }, {
              onConflict: 'month'
            });
        }
        console.log('✅ Cache updated successfully');
        
      } catch (xeroError: any) {
        console.log('❌ Xero API error:', xeroError);
        
        // If no connection found, provide helpful error message
        if (xeroError.message && xeroError.message.includes('No Xero connection found')) {
          return NextResponse.json(
            { error: 'Please connect to Xero in Settings first', needsConnection: true },
            { status: 400 }
          );
        }
        
        throw xeroError;
      }
    }

    console.log('📊 Monthly financial data sample:', monthlyFinancialData.slice(0, 2).map(month => ({
      month: month.month,
      name: month.name,
      avgTurnover: month.avgTurnover,
      grossMargin: month.grossMargin,
      materialCost: month.materialCost,
      subcontractorUse: month.subcontractorUse
    })));

    // Apply date filters and switch to weekly granularity if needed
    let filteredChartData = monthlyFinancialData;
    let granularity = 'monthly';
    
    if (dateFrom || dateTo) {
      console.log('🔍 Applying date filters:', { dateFrom, dateTo });
      
      // Calculate the date range with proper date parsing
      const startDate = dateFrom ? new Date(dateFrom + 'T00:00:00.000Z') : new Date(monthlyFinancialData[0]?.month + '-01T00:00:00.000Z');
      const endDate = dateTo ? new Date(dateTo + 'T23:59:59.999Z') : new Date();
      
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log('📅 Date range:', daysDiff, 'days');
      console.log('📅 Parsed dates:', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        originalFilters: { dateFrom, dateTo },
        granularityDecision: daysDiff <= 120 ? 'weekly (flexible dates)' : 'monthly',
        threshold: '120 days for weekly vs monthly'
      });
      
      if (daysDiff <= 120) {
        // For periods 4 months or less, use weekly granularity
        granularity = 'weekly';
        filteredChartData = await generateWeeklyFinancialData(xeroClient, startDate, endDate);
      } else {
        // For longer periods, filter monthly data to the selected range
        granularity = 'monthly';
        filteredChartData = [];
        
        const currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        const now = new Date();
        
        console.log('📅 Generating monthly data from', currentMonth.toISOString().slice(0, 7), 'to', endMonth.toISOString().slice(0, 7));
        
        while (currentMonth <= endMonth) {
          const monthKey = currentMonth.toISOString().slice(0, 7);
          
          // For the current month, show today's date, otherwise show month/year
          let name;
          const isCurrentMonth = currentMonth.getFullYear() === now.getFullYear() && currentMonth.getMonth() === now.getMonth();
          if (isCurrentMonth) {
            name = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          } else {
            name = currentMonth.toLocaleString('en-GB', { month: 'short', year: '2-digit' });
          }
          
          // Find the corresponding data from our monthly data
          const historicalData = monthlyFinancialData.find((item: any) => item.month === monthKey);
          
          if (historicalData) {
            filteredChartData.push(historicalData);
          } else {
            // Generate placeholder data for missing months
            filteredChartData.push({
              month: monthKey,
              name,
              avgTurnover: 0,
              grossMargin: 0,
              materialCost: 0,
              subcontractorUse: 0
            });
          }
          
          currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
        
        console.log('📊 Generated monthly data for range:', {
          firstMonth: filteredChartData[0]?.name,
          lastMonth: filteredChartData[filteredChartData.length - 1]?.name,
          totalMonths: filteredChartData.length
        });
      }
      
      console.log('📊 Using', granularity, 'granularity with', filteredChartData.length, 'data points');
    }

    // Calculate period totals for display
    const periodTotals = {
      avgTurnover: filteredChartData.reduce((sum: number, item: any) => sum + (item.avgTurnover || 0), 0),
      grossMargin: filteredChartData.length > 0 
        ? filteredChartData.reduce((sum: number, item: any) => sum + (item.grossMargin || 0), 0) / filteredChartData.length 
        : 0,
      materialCost: filteredChartData.reduce((sum: number, item: any) => sum + (item.materialCost || 0), 0),
      subcontractorUse: filteredChartData.reduce((sum: number, item: any) => sum + (item.subcontractorUse || 0), 0)
    };

    // Prepare financial analytics data in the format expected by the frontend
    const financialAnalyticsData = [
      {
        key: 'avg_turnover',
        label: (dateFrom || dateTo) ? 'Total Turnover (Period)' : 'Total Turnover (12 Months)',
        value: `£${Math.round(periodTotals.avgTurnover).toLocaleString()}`,
        isCurrency: true,
        data: filteredChartData.map(item => ({
          name: item.name,
          value: parseFloat(item.avgTurnover.toFixed(2))
        }))
      },
      {
        key: 'gross_margin',
        label: (dateFrom || dateTo) ? 'Avg Gross Margin % (Period)' : 'Avg Gross Margin % (12 Months)',
        value: `${periodTotals.grossMargin.toFixed(1)}%`,
        isPercentage: true,
        data: filteredChartData.map(item => ({
          name: item.name,
          value: parseFloat(item.grossMargin.toFixed(2))
        }))
      },
      {
        key: 'material_cost',
        label: (dateFrom || dateTo) ? 'Total Material Cost (Period)' : 'Total Material Cost (12 Months)',
        value: `£${Math.round(periodTotals.materialCost).toLocaleString()}`,
        isCurrency: true,
        data: filteredChartData.map(item => ({
          name: item.name,
          value: parseFloat(item.materialCost.toFixed(2))
        }))
      },
      {
        key: 'subcontractor_use',
        label: (dateFrom || dateTo) ? 'Total Subcontractor Cost (Period)' : 'Total Subcontractor Cost (12 Months)',
        value: `£${Math.round(periodTotals.subcontractorUse).toLocaleString()}`,
        isCurrency: true,
        data: filteredChartData.map(item => ({
          name: item.name,
          value: parseFloat(item.subcontractorUse.toFixed(2))
        }))
      }
    ];

    console.log('✅ Xero financial analytics data processed successfully');
    console.log('📊 Financial analytics data structure:', {
      totalDataSets: financialAnalyticsData.length,
      dataSetKeys: financialAnalyticsData.map(d => d.key),
      sampleDataPoint: financialAnalyticsData[0]?.data[0],
      chartDataLength: filteredChartData.length
    });

    return NextResponse.json({
      success: true,
      data: financialAnalyticsData,
      metadata: {
        lastUpdated: new Date().toISOString(),
        historicalDataPoints: filteredChartData.length,
        granularity,
        filtersApplied: { dateFrom, dateTo },
        dataRange: {
          start: filteredChartData[0]?.month || monthlyFinancialData[0]?.month,
          end: filteredChartData[filteredChartData.length - 1]?.month || monthlyFinancialData[monthlyFinancialData.length - 1]?.month
        },
        totals: periodTotals,
        cached: hasFreshCache && !forceRefresh,
        cacheStatus: hasFreshCache ? 'fresh' : 'stale'
      }
    });

  } catch (error) {
    console.error('❌ Xero financial analytics API error:', error);
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : String(error)) || 'Failed to fetch Xero financial data' },
      { status: 500 }
    );
  }
}

