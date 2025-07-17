const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function fixRLSPolicies() {
  try {
    // Load environment variables from .env.local
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });

    console.log('Environment variables loaded');

    // Create Supabase client
    const supabase = createClient(
      envVars.NEXT_PUBLIC_SUPABASE_URL,
      envVars.SUPABASE_SERVICE_KEY
    );

    // Read the SQL file
    const sql = fs.readFileSync('scripts/fix-rls-policies.sql', 'utf8');
    
    console.log('Executing RLS policy fixes...');

    // Split SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        const { data, error } = await supabase.rpc('exec_sql', { 
          query: statement.trim() + ';' 
        });
        
        if (error) {
          console.error('Error executing statement:', error);
        } else {
          console.log('Success');
        }
      }
    }
    
    console.log('RLS policies update completed!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixRLSPolicies(); 