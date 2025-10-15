import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Xero OAuth 2.0 authorization endpoint
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.XERO_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/xero/callback`;
    
    if (!clientId) {
      return NextResponse.json({ error: 'Xero client ID not configured' }, { status: 500 });
    }

    // Xero OAuth parameters
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'accounting.reports.read accounting.transactions.read offline_access',
      state: Math.random().toString(36).substring(7), // Simple state for CSRF protection
    });

    const authUrl = `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
    
    console.log('🔐 Redirecting to Xero OAuth:', authUrl);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('❌ Error initiating Xero OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Xero authorization' },
      { status: 500 }
    );
  }
}

