import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function AuthPage() {
  const router = useRouter();
  const { linkId } = router.query;
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [technicalDetails, setTechnicalDetails] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!linkId) return;

    // Check for success/error in URL
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    const userEmail = urlParams.get('email');

    if (success) {
      setStatus('success');
      setEmail(userEmail || '');
      return;
    }

    if (error) {
      setStatus('error');
      const errorMessages = {
        invalid_link: 'Invalid or expired link',
        token_exchange_failed: 'Authentication failed',
        invalid_tokens: 'Authentication failed',
        userinfo_failed: 'Failed to get user information',
        missing_oauth_session: 'Login session expired. Please request a new link and try again.',
        invalid_email: 'Invalid account email returned from provider',
        storage_failed: 'Failed to save account',
        db_permission_denied: 'Database permission denied. Please verify SUPABASE_SERVICE_KEY is the Service Role key and that RLS policies exist.',
        db_invalid_key: 'Invalid database key. Please verify SUPABASE_SERVICE_KEY on Render is correct and not anon/publishable.',
        db_network_error: 'Database network error. Please try again or check Render outbound connectivity.',
        server_misconfigured: 'Server configuration error. Please contact the administrator to fix deployment settings and generate a new link.',
        server_error: 'Server error occurred',
        missing_params: 'Missing parameters',
        link_expired: 'This link has expired',
        link_already_used: 'This link has already been used',
        service_busy: 'Service is busy, please try again',
        timeout: 'Request timeout, please try again'
      };
      setMessage(errorMessages[error] || 'An unexpected error occurred');
      if (errorDescription) {
        setTechnicalDetails(decodeURIComponent(errorDescription));
      }
      return;
    }

    // Validate link
    validateLink();
  }, [linkId]);

  const validateLink = async () => {
    try {
      const response = await fetch(`/api/auth/validate?linkId=${linkId}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setStatus('ready');
      } else {
        setStatus('error');
        setMessage(data.error || 'Invalid link');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Connection error');
    }
  };

  const handleLogin = () => {
    window.location.href = `/api/auth/authorize?linkId=${linkId}`;
  };

  const handleGptLogin = () => {
    window.location.href = `/api/gpt/authorize?linkId=${linkId}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        {status === 'loading' && (
          <div style={styles.content}>
            <div style={styles.spinner}></div>
            <h2 style={styles.title}>Verifying link...</h2>
          </div>
        )}

        {status === 'ready' && (
          <div style={styles.content}>
            <div style={styles.iconContainer}>
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="38" fill="#4285F4" opacity="0.1"/>
                <path d="M40 20C28.954 20 20 28.954 20 40C20 51.046 28.954 60 40 60C51.046 60 60 51.046 60 40C60 28.954 51.046 20 40 20ZM40 24C48.837 24 56 31.163 56 40C56 48.837 48.837 56 40 56C31.163 56 24 48.837 24 40C24 31.163 31.163 24 40 24Z" fill="#4285F4"/>
                <path d="M40 28C33.373 28 28 33.373 28 40C28 46.627 33.373 52 40 52C46.627 52 52 46.627 52 40C52 33.373 46.627 28 40 28Z" fill="#4285F4"/>
              </svg>
            </div>
            
            <h1 style={styles.mainTitle}>Sign in to Continue</h1>
            <p style={styles.subtitle}>Click the button below to sign in with your Google account</p>
            
            <button onClick={handleLogin} style={styles.googleButton}>
              <svg width="24" height="24" viewBox="0 0 24 24" style={styles.googleIcon}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>

            <button onClick={handleGptLogin} style={styles.gptButton}>
              <svg width="24" height="24" viewBox="0 0 24 24" style={styles.gptIcon}>
                <path fill="#10A37F" d="M12 2.5c-1.77 0-3.37.73-4.5 1.9C6.37 3.23 4.77 2.5 3 2.5v2c.98 0 1.88.4 2.52 1.04C5.4 6.18 5 7.08 5 8.06h2c0-1.1.9-2 2-2 .98 0 1.88.4 2.52 1.04L12 7.58l.48-.48C13.12 6.46 14.02 6.06 15 6.06c1.1 0 2 .9 2 2h2c0-.98-.4-1.88-1.04-2.52C18.6 4.9 19.5 4.5 20.5 4.5v-2c-1.77 0-3.37.73-4.5 1.9C15.37 3.23 13.77 2.5 12 2.5z"/>
                <path fill="#10A37F" d="M7 9.5c-1.38 0-2.5 1.12-2.5 2.5S5.62 14.5 7 14.5h1v-2H7c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h1v-2H7z"/>
                <path fill="#10A37F" d="M16 9.5h-1v2h1c.28 0 .5.22.5.5s-.22.5-.5.5h-1v2h1c1.38 0 2.5-1.12 2.5-2.5S17.38 9.5 16 9.5z"/>
                <path fill="#10A37F" d="M10 9.5h4v5h-4v-5zm2-1.5c-2.21 0-4 1.79-4 4v7h2v-2h4v2h2v-7c0-2.21-1.79-4-4-4z"/>
              </svg>
              Sign in with GPT (OpenAI)
            </button>
            
            <p style={styles.note}>
              This is a secure authentication link. Your account will be automatically registered.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div style={styles.content}>
            <div style={styles.successIconContainer}>
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="48" fill="#10B981" opacity="0.1"/>
                <path d="M50 10C27.909 10 10 27.909 10 50C10 72.091 27.909 90 50 90C72.091 90 90 72.091 90 50C90 27.909 72.091 10 50 10ZM50 15C69.33 15 85 30.67 85 50C85 69.33 69.33 85 50 85C30.67 85 15 69.33 15 50C15 30.67 30.67 15 50 15Z" fill="#10B981"/>
                <path d="M42 50L47 55L58 44" stroke="#10B981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <h1 style={styles.successTitle}>Successfully Signed In!</h1>
            
            {email && (
              <div style={styles.emailBox}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={styles.emailIcon}>
                  <path d="M3 4H17C17.55 4 18 4.45 18 5V15C18 15.55 17.55 16 17 16H3C2.45 16 2 15.55 2 15V5C2 4.45 2.45 4 3 4Z" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 5L10 11L2 5" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={styles.emailText}>{email}</span>
              </div>
            )}
            
            <div style={styles.successMessage}>
              <p style={styles.successText}>
                ✓ Your account has been successfully registered
              </p>
              <p style={styles.successText}>
                ✓ Account data saved securely
              </p>
              <p style={styles.successText}>
                ✓ Ready to use in 9router
              </p>
            </div>
            
            <div style={styles.infoBox}>
              <p style={styles.infoText}>
                Your account is now active and will be synced to the local 9router tool.
              </p>
            </div>
            
            <p style={styles.closeNote}>
              You can safely close this page now.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div style={styles.content}>
            <div style={styles.errorIconContainer}>
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="48" fill="#EF4444" opacity="0.1"/>
                <path d="M50 10C27.909 10 10 27.909 10 50C10 72.091 27.909 90 50 90C72.091 90 90 72.091 90 50C90 27.909 72.091 10 50 10ZM50 15C69.33 15 85 30.67 85 50C85 69.33 69.33 85 50 85C30.67 85 15 69.33 15 50C15 30.67 30.67 15 50 15Z" fill="#EF4444"/>
                <path d="M40 40L60 60M60 40L40 60" stroke="#EF4444" strokeWidth="4" strokeLinecap="round"/>
              </svg>
            </div>
            
            <h1 style={styles.errorTitle}>Authentication Failed</h1>
            <p style={styles.errorMessage}>{message}</p>
            
            {technicalDetails && (
              <div style={styles.technicalBox}>
                <p style={styles.technicalTitle}>Technical Details:</p>
                <code style={styles.technicalCode}>{technicalDetails}</code>
              </div>
            )}
            
            <div style={styles.errorHelp}>
              <p style={styles.errorHelpText}>
                Please contact the administrator for a new link.
              </p>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '50px 40px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    textAlign: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    width: '60px',
    height: '60px',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  iconContainer: {
    marginBottom: '30px',
  },
  mainTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '12px',
    marginTop: '0',
  },
  title: {
    fontSize: '24px',
    color: '#4B5563',
    margin: '0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6B7280',
    marginBottom: '40px',
    lineHeight: '1.6',
  },
  googleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    background: 'white',
    border: '2px solid #E5E7EB',
    borderRadius: '12px',
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    cursor: 'pointer',
    transition: 'all 0.3s',
    width: '100%',
    maxWidth: '320px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  gptButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    background: 'white',
    border: '2px solid #D1FAE5',
    borderRadius: '12px',
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: '700',
    color: '#065F46',
    cursor: 'pointer',
    transition: 'all 0.3s',
    width: '100%',
    maxWidth: '320px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    marginTop: '14px',
  },
  googleIcon: {
    flexShrink: 0,
  },
  gptIcon: {
    flexShrink: 0,
  },
  note: {
    fontSize: '13px',
    color: '#9CA3AF',
    marginTop: '30px',
    lineHeight: '1.5',
    maxWidth: '360px',
  },
  successIconContainer: {
    marginBottom: '30px',
  },
  successTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#10B981',
    marginBottom: '20px',
    marginTop: '0',
  },
  emailBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    padding: '14px 20px',
    marginBottom: '30px',
    width: '100%',
    maxWidth: '360px',
  },
  emailIcon: {
    flexShrink: 0,
  },
  emailText: {
    fontSize: '15px',
    color: '#374151',
    fontWeight: '500',
    wordBreak: 'break-all',
  },
  successMessage: {
    background: '#ECFDF5',
    border: '1px solid #A7F3D0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '25px',
    width: '100%',
    maxWidth: '360px',
  },
  successText: {
    fontSize: '15px',
    color: '#065F46',
    margin: '8px 0',
    textAlign: 'left',
    lineHeight: '1.6',
  },
  infoBox: {
    background: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '20px',
    width: '100%',
    maxWidth: '360px',
  },
  infoText: {
    fontSize: '14px',
    color: '#1E40AF',
    margin: '0',
    lineHeight: '1.6',
  },
  closeNote: {
    fontSize: '14px',
    color: '#6B7280',
    fontStyle: 'italic',
    margin: '0',
  },
  errorIconContainer: {
    marginBottom: '30px',
  },
  errorTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: '15px',
    marginTop: '0',
  },
  errorMessage: {
    fontSize: '16px',
    color: '#6B7280',
    marginBottom: '25px',
    lineHeight: '1.6',
  },
  errorHelp: {
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '10px',
    padding: '16px',
    width: '100%',
    maxWidth: '360px',
  },
  errorHelpText: {
    fontSize: '14px',
    color: '#991B1B',
    margin: '0',
    lineHeight: '1.6',
  },
  technicalBox: {
    background: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '20px',
    width: '100%',
    maxWidth: '360px',
    textAlign: 'left',
  },
  technicalTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: '6px',
    marginTop: '0',
  },
  technicalCode: {
    fontSize: '12px',
    color: '#EF4444',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
};
