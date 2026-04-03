import { createClient } from '@supabase/supabase-js';
import { logError, retryWithBackoff } from './security';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Connection pool settings for better performance
const connectionOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'antigravity-auth-manager/1.0.0',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
};

// Client for public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, connectionOptions);

// Admin client for server-side operations with retry wrapper
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, connectionOptions)
  : null;

// Wrapper functions with automatic retry and error handling
export async function supabaseQuery(queryFn, context = {}) {
  try {
    return await retryWithBackoff(
      async () => {
        const result = await queryFn();
        
        if (result.error) {
          throw result.error;
        }
        
        return result;
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        onRetry: (error, attempt) => {
          logError(error, { ...context, attempt, type: 'supabase-query' });
        }
      }
    );
  } catch (error) {
    logError(error, { ...context, type: 'supabase-query-failed' });
    throw error;
  }
}

// Health check for Supabase connection
export async function checkSupabaseHealth() {
  try {
    const { error } = await supabaseAdmin
      .from('auth_links')
      .select('id')
      .limit(1);
    
    return !error;
  } catch (error) {
    logError(error, { context: 'supabase-health-check' });
    return false;
  }
}
