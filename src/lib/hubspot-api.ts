// HubSpot API Client for fetching deal data
export class HubSpotAPIClient {
  private apiKey: string;
  private baseUrl = 'https://api.hubapi.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async apiCall(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HubSpot API call failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Search for deals by stage
  async searchDealsByStage(stageId: string, limit: number = 100) {
    const searchBody = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'dealstage',
              operator: 'EQ',
              value: stageId
            }
          ]
        }
      ],
      properties: [
        'dealname',
        'amount',
        'dealstage',
        'pipeline',
        'createdate',
        'closedate',
        'hs_lastmodifieddate'
      ],
      limit
    };

    return this.apiCall('/crm/v3/objects/deals/search', {
      method: 'POST',
      body: JSON.stringify(searchBody)
    });
  }

  // Get deals in Advanced Negotiations
  async getAdvancedNegotiationsDeals() {
    const stageId = process.env.HUBSPOT_ADVANCED_NEGOTIATIONS_STAGE_ID;
    if (!stageId) {
      throw new Error('HUBSPOT_ADVANCED_NEGOTIATIONS_STAGE_ID not configured');
    }
    return this.searchDealsByStage(stageId);
  }

  // Get Closed Won deals
  async getClosedWonDeals() {
    const stageId = process.env.HUBSPOT_CLOSED_WON_STAGE_ID;
    if (!stageId) {
      throw new Error('HUBSPOT_CLOSED_WON_STAGE_ID not configured');
    }
    return this.searchDealsByStage(stageId);
  }

  // Get deals closed won in a specific time period
  async getClosedWonDealsInPeriod(startDate: string, endDate: string) {
    const searchBody = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'dealstage',
              operator: 'EQ',
              value: process.env.HUBSPOT_CLOSED_WON_STAGE_ID
            },
            {
              propertyName: 'closedate',
              operator: 'GTE',
              value: startDate
            },
            {
              propertyName: 'closedate',
              operator: 'LTE',
              value: endDate
            }
          ]
        }
      ],
      properties: [
        'dealname',
        'amount',
        'dealstage',
        'closedate',
        'createdate'
      ],
      limit: 100
    };

    return this.apiCall('/crm/v3/objects/deals/search', {
      method: 'POST',
      body: JSON.stringify(searchBody)
    });
  }

  // Get historical data for multiple months (simplified approach)
  async getHistoricalClosedWonData(monthsBack: number = 12) {
    console.log('🔍 Fetching historical closed won data for', monthsBack, 'months...');
    
    try {
      // Get all closed won deals from the last year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const today = new Date();
      
      const startDateStr = oneYearAgo.toISOString().split('T')[0];
      const endDateStr = today.toISOString().split('T')[0];
      
      console.log('📅 Fetching deals from', startDateStr, 'to', endDateStr);
      
      const response = await this.getClosedWonDealsInPeriod(startDateStr, endDateStr);
      const allDeals = response.results || [];
      
      console.log('💼 Found', allDeals.length, 'closed won deals in the past year');
      
      // Group deals by month
      const historicalData: any[] = [];
      const now = new Date();
      
      for (let i = monthsBack - 1; i >= 0; i--) {
        const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const monthKey = startDate.toISOString().slice(0, 7);
        
        // Filter deals for this month
        const monthDeals = allDeals.filter((deal: any) => {
          const closeDate = deal.properties.closedate;
          if (!closeDate) return false;
          
          const dealDate = new Date(closeDate);
          return dealDate >= startDate && dealDate <= endDate;
        });
        
        const totalAmount = monthDeals.reduce((sum: number, deal: any) => {
          return sum + (parseFloat(deal.properties.amount || '0') || 0);
        }, 0);
        
        // For the current month, show today's date, otherwise show month/year
        const now = new Date();
        let name;
        const isCurrentMonth = startDate.getFullYear() === now.getFullYear() && startDate.getMonth() === now.getMonth();
        if (isCurrentMonth) {
          // Current month - show "17 Sep" format (today's date)
          name = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        } else {
          // Historical months - show "Sep 24" format
          name = startDate.toLocaleString('en-GB', { month: 'short', year: '2-digit' });
        }
        
        console.log('📅 HubSpot historical data generated:', { monthKey, name, isCurrentMonth, totalAmount });
        
        historicalData.push({
          month: monthKey,
          name,
          totalAmount,
          dealCount: monthDeals.length,
          deals: monthDeals
        });
      }
      
      console.log('📊 Generated historical data for', historicalData.length, 'months');
      return historicalData;
      
    } catch (error) {
      console.error('❌ Failed to fetch historical data:', error);
      throw error;
    }
  }

  // Get all deals (for advanced negotiations tracking over time)
  async getAllDealsInStage(stageId: string, limit: number = 1000) {
    const searchBody = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'dealstage',
              operator: 'EQ',
              value: stageId
            }
          ]
        }
      ],
      properties: [
        'dealname',
        'amount',
        'dealstage',
        'createdate',
        'closedate',
        'hs_lastmodifieddate'
      ],
      limit,
      sorts: [
        {
          propertyName: 'createdate',
          direction: 'DESCENDING'
        }
      ]
    };

    return this.apiCall('/crm/v3/objects/deals/search', {
      method: 'POST',
      body: JSON.stringify(searchBody)
    });
  }
}

// Export singleton instance
export const hubspotAPI = new HubSpotAPIClient(process.env.HUBSPOT_API_KEY || '');
