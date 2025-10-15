'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function XeroConnectionCard() {
  const [connection, setConnection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchConnection();
    
    // Check for OAuth callback status in URL
    const params = new URLSearchParams(window.location.search);
    const xeroSuccess = params.get('xero_success');
    const xeroError = params.get('xero_error');
    const orgName = params.get('org');
    
    if (xeroSuccess) {
      setSuccess(`Successfully connected to ${orgName || 'Xero'}!`);
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/settings');
    } else if (xeroError) {
      setError(`Connection failed: ${xeroError.replace(/_/g, ' ')}`);
      window.history.replaceState({}, '', '/dashboard/settings');
    }
  }, []);

  const fetchConnection = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('xero_connection')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }

      setConnection(data);
    } catch (err: any) {
      console.error('Error fetching Xero connection:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = '/api/xero/auth';
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from Xero? This will stop financial data synchronization.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('xero_connection')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;

      setConnection(null);
      setSuccess('Successfully disconnected from Xero');
    } catch (err: any) {
      console.error('Error disconnecting from Xero:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Xero Integration</h2>
        <p className="text-sm text-gray-600">
          Connect your Xero account to automatically fetch financial data for analytics
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="mt-2 text-xs text-green-600 hover:text-green-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6551]"></div>
        </div>
      ) : connection ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Connected to Xero</p>
                <p className="text-xs text-gray-600">{connection.tenant_name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {new Date(connection.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium">Financial data is synchronized automatically</p>
                <p className="mt-1 text-xs text-blue-700">
                  Your financial analytics will show real-time data from your Xero account. Data refreshes automatically when you view the analytics page.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-4">
              Connect your Xero account to enable real-time financial analytics including:
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Average Turnover
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Gross Margin
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Material Costs
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Subcontractor Use
              </li>
            </ul>
          </div>

          <button
            onClick={handleConnect}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#13B5EA] hover:bg-[#0E9FD1] text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Connect to Xero
          </button>

          <p className="text-xs text-gray-500 text-center">
            You'll be redirected to Xero to authorize the connection
          </p>
        </div>
      )}
    </div>
  );
}

