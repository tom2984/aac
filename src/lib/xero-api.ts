// Xero API Client for fetching financial data with OAuth token management
export class XeroAPIClient {
  private clientId: string
  private clientSecret: string
  private baseUrl = 'https://api.xero.com/api.xro/2.0'
  private identityUrl = 'https://identity.xero.com/connect/token'
  private supabaseAdmin: any

  constructor(clientId: string, clientSecret: string, supabaseAdmin: any) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.supabaseAdmin = supabaseAdmin
  }

  // Get access token from database and refresh if needed
  private async getAccessToken(): Promise<{ token: string; tenantId: string }> {
    // Get stored connection from database
    const { data: connection, error } = await this.supabaseAdmin
      .from('xero_connection')
      .select('*')
      .single();

    if (error || !connection) {
      throw new Error('No Xero connection found. Please connect to Xero in settings.');
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const expiresAt = new Date(connection.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt <= fiveMinutesFromNow) {
      console.log('🔄 Access token expired, refreshing...');
      return await this.refreshAccessToken(connection.refresh_token, connection.id);
    }

    return {
      token: connection.access_token,
      tenantId: connection.tenant_id
    };
  }

  // Refresh access token using refresh token
  private async refreshAccessToken(refreshToken: string, connectionId: string): Promise<{ token: string; tenantId: string }> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch(this.identityUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token refresh failed:', errorText);
      throw new Error(`Failed to refresh Xero token: ${response.status}`);
    }

    const tokenData = await response.json();
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Update tokens in database
    const { data: updatedConnection, error } = await this.supabaseAdmin
      .from('xero_connection')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update Xero tokens in database');
    }

    console.log('✅ Access token refreshed successfully');

    return {
      token: updatedConnection.access_token,
      tenantId: updatedConnection.tenant_id
    };
  }

  // Generic API call helper
  private async apiCall(endpoint: string, options: RequestInit = {}) {
    const { token, tenantId } = await this.getAccessToken();

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Xero-tenant-id': tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Xero API error:', errorText);
      throw new Error(`Xero API call failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Get Profit & Loss report for a specific period
  async getProfitAndLossReport(fromDate: string, toDate: string) {
    const endpoint = `/Reports/ProfitAndLoss?fromDate=${fromDate}&toDate=${toDate}&standardLayout=false&paymentsOnly=false`
    return this.apiCall(endpoint)
  }

  // Get monthly Profit & Loss data for the last 12 months
  async getMonthlyProfitAndLossData(monthsBack: number = 12) {
    const monthlyData = []
    const now = new Date()
    
    for (let i = monthsBack - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0) // Last day of month
      
      const fromDate = startDate.toISOString().split('T')[0]
      const toDate = endDate.toISOString().split('T')[0]
      
      try {
        const reportData = await this.getProfitAndLossReport(fromDate, toDate)
        
        // Generate month name in same format as HubSpot analytics
        let name
        if (i === 0) {
          // Current month - show today's date
          name = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        } else {
          // Historical months - show "Sep 24" format
          name = startDate.toLocaleString('en-GB', { month: 'short', year: '2-digit' })
        }
        
        monthlyData.push({
          month: startDate.toISOString().slice(0, 7),
          name,
          fromDate,
          toDate,
          reportData
        })
      } catch (error) {
        console.warn(`Failed to fetch P&L data for ${fromDate} to ${toDate}:`, error)
        
        // Add placeholder data
        let name
        if (i === 0) {
          name = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        } else {
          name = startDate.toLocaleString('en-GB', { month: 'short', year: '2-digit' })
        }
        
        monthlyData.push({
          month: startDate.toISOString().slice(0, 7),
          name,
          fromDate,
          toDate,
          reportData: null // Will be handled in calculations
        })
      }
      
      // Add delay to respect rate limits (max 60 calls per minute)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1100)) // 1.1 second delay
      }
    }
    
    return monthlyData
  }

  // Extract financial metrics from P&L report data
  extractFinancialMetrics(reportData: any) {
    if (!reportData || !reportData.Reports || reportData.Reports.length === 0) {
      console.log('⚠️ No report data found in Xero response');
      return {
        revenue: 0,
        cogs: 0,
        materialCosts: 0,
        subcontractorCosts: 0
      }
    }

    const report = reportData.Reports[0]
    const rows = report.Rows || []
    
    // DEBUG: Log the report period for tracking
    console.log('📊 Processing Xero P&L:', report.ReportTitles?.[2] || 'Unknown period');
    
    let revenue = 0
    let cogs = 0
    let materialCosts = 0
    let subcontractorCosts = 0

    // Helper function to extract values from nested row structure
    const extractRowValues = (rows: any[], targetTypes: string[]) => {
      let total = 0
      
      for (const row of rows) {
        const sectionTitle = (row.Title || '').toLowerCase()
        
        // Check if this section matches what we're looking for
        if (row.RowType === 'Section' && row.Rows) {
          // For revenue - look in "Income" section
          if (targetTypes.includes('revenue') && sectionTitle.includes('income')) {
            // Find the "Total Income" summary row
            const summaryRow = row.Rows.find((r: any) => 
              r.RowType === 'SummaryRow' && 
              r.Cells?.[0]?.Value?.toLowerCase().includes('total income')
            )
            if (summaryRow && summaryRow.Cells?.[1]) {
              const value = parseFloat(summaryRow.Cells[1].Value || '0')
              if (!isNaN(value)) total += Math.abs(value)
            }
          }
          
          // For COGS - look in "Less Cost of Sales" section
          if (targetTypes.includes('cogs') && sectionTitle.includes('cost of sales')) {
            // Find the "Total Cost of Sales" summary row
            const summaryRow = row.Rows.find((r: any) => 
              r.RowType === 'SummaryRow' && 
              r.Cells?.[0]?.Value?.toLowerCase().includes('total cost of sales')
            )
            if (summaryRow && summaryRow.Cells?.[1]) {
              const value = parseFloat(summaryRow.Cells[1].Value || '0')
              if (!isNaN(value)) total += Math.abs(value)
            }
          }
          
          // For materials and subcontractors - look through individual rows in Cost of Sales
          if ((targetTypes.includes('materials') || targetTypes.includes('subcontractor')) && 
              sectionTitle.includes('cost of sales')) {
            for (const nestedRow of row.Rows) {
              if (nestedRow.RowType === 'Row' && nestedRow.Cells?.[0]?.Value) {
                const accountName = nestedRow.Cells[0].Value.toLowerCase()
                const value = parseFloat(nestedRow.Cells[1]?.Value || '0')
                
                if (!isNaN(value)) {
                  // Material costs identification
                  if (targetTypes.includes('materials') && (
                    accountName.includes('materials') ||
                    accountName.includes('pvc') ||
                    accountName.includes('insulation') ||
                    accountName.includes('hot melt') ||
                    accountName.includes('fixings') ||
                    accountName.includes('adhesives') ||
                    accountName.includes('flags') ||
                    accountName.includes('ballast') ||
                    accountName.includes('liquid')
                  )) {
                    total += Math.abs(value)
                  }
                  
                  // Subcontractor costs identification (LOSC = Labour Only Sub Contractor)
                  if (targetTypes.includes('subcontractor') && (
                    accountName.includes('losc') ||
                    accountName.includes('subcontractor') ||
                    accountName.includes('day rate') ||
                    accountName.includes('price work')
                  )) {
                    total += Math.abs(value)
                  }
                }
              }
            }
          }
        }
      }
      
      return total
    }

    // Extract each metric
    revenue = extractRowValues(rows, ['revenue', 'income'])
    cogs = extractRowValues(rows, ['cogs'])
    materialCosts = extractRowValues(rows, ['materials'])
    subcontractorCosts = extractRowValues(rows, ['subcontractor'])

    console.log('📊 Extracted Metrics:', {
      revenue,
      cogs,
      materialCosts,
      subcontractorCosts,
      grossMargin: revenue > 0 ? ((revenue - cogs) / revenue * 100).toFixed(2) + '%' : '0%'
    });

    return {
      revenue,
      cogs,
      materialCosts,
      subcontractorCosts
    }
  }

  // Calculate financial metrics with derived values
  calculateFinancialMetrics(monthlyData: any[]) {
    return monthlyData.map(month => {
      const metrics = this.extractFinancialMetrics(month.reportData)
      
      // Calculate gross margin percentage
      const grossMarginPercentage = metrics.revenue > 0 
        ? ((metrics.revenue - metrics.cogs) / metrics.revenue) * 100 
        : 0

      // Log detailed calculation for verification
      console.log(`📊 ${month.name} Financial Breakdown:`, {
        revenue: `£${metrics.revenue.toFixed(2)}`,
        cogs: `£${metrics.cogs.toFixed(2)}`,
        grossProfit: `£${(metrics.revenue - metrics.cogs).toFixed(2)}`,
        grossMarginPercentage: `${grossMarginPercentage.toFixed(2)}%`,
        materialCosts: `£${metrics.materialCosts.toFixed(2)}`,
        subcontractorCosts: `£${metrics.subcontractorCosts.toFixed(2)}`
      })

      return {
        month: month.month,
        name: month.name,
        avgTurnover: metrics.revenue,
        grossMargin: grossMarginPercentage,
        materialCost: metrics.materialCosts,
        subcontractorUse: metrics.subcontractorCosts
      }
    })
  }
}

