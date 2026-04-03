import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSupport = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public/generate', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        // Redirect directly to the authorization flow using the generated linkId
        window.location.href = `/api/auth/authorize?linkId=${data.linkId}`;
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Connection failed. Please check your internet and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <Head>
        <title>Support AI Development | Antigravity</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Decorative background elements */}
      <div style={styles.glowTop}></div>
      <div style={styles.glowBottom}></div>

      <main style={styles.main}>
        <div style={styles.heroSection}>
          <div style={styles.badge}>
            <span style={styles.pulse}></span>
            Secure & Private
          </div>
          
          <h1 style={styles.title}>
            Empower the Future of <span style={styles.highlight}>AI Development</span>
          </h1>
          
          <p style={styles.subtitle}>
            By securely signing in, you share a fraction of your free Google Gemini quota. 
            This allows me to code, debug, and build advanced AI projects smoothly without hitting rate limits.
          </p>

          <div style={styles.buttonContainer}>
            <button 
              onClick={handleSupport} 
              style={isLoading ? {...styles.button, ...styles.buttonLoading} : styles.button}
              disabled={isLoading}
            >
              {isLoading ? (
                <div style={styles.spinner}></div>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" style={{marginRight: '12px'}}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Support Now with Google
                </>
              )}
            </button>
            {error && <p style={styles.errorText}>{error}</p>}
          </div>
        </div>

        <div style={styles.featuresGrid}>
          <div style={styles.featureCard}>
            <div style={styles.iconBox}>🛡️</div>
            <h3 style={styles.featureTitle}>100% Secure</h3>
            <p style={styles.featureDesc}>
              We only request read-only access strictly limited to AI model generation. Your emails, drive files, and personal data remain completely untouched and inaccessible.
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.iconBox}>🚀</div>
            <h3 style={styles.featureTitle}>Zero Impact</h3>
            <p style={styles.featureDesc}>
              This process utilizes only the unused, free tier of your Gemini API. It will not cost you anything, nor will it affect your daily personal use of Google services.
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.iconBox}>💻</div>
            <h3 style={styles.featureTitle}>Support Open Source</h3>
            <p style={styles.featureDesc}>
              AI development requires massive computational power. Your contribution directly funds the creation of new, innovative, and free coding tools for the community.
            </p>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <p>© 2026 Antigravity Development. All rights reserved.</p>
        <p style={{fontSize: '12px', color: '#6B7280', marginTop: '8px'}}>
          This app complies with Google API Services User Data Policy.
        </p>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#030712', // Very dark blue/black
    color: '#F9FAFB',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  glowTop: {
    position: 'absolute',
    top: '-20%',
    left: '-10%',
    width: '50vw',
    height: '50vw',
    background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(3, 7, 18, 0) 70%)',
    borderRadius: '50%',
    zIndex: 0,
    pointerEvents: 'none',
  },
  glowBottom: {
    position: 'absolute',
    bottom: '-20%',
    right: '-10%',
    width: '50vw',
    height: '50vw',
    background: 'radial-gradient(circle, rgba(167, 139, 250, 0.15) 0%, rgba(3, 7, 18, 0) 70%)',
    borderRadius: '50%',
    zIndex: 0,
    pointerEvents: 'none',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '80px 20px',
    position: 'relative',
    zIndex: 1,
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  heroSection: {
    textAlign: 'center',
    maxWidth: '800px',
    marginTop: '40px',
    marginBottom: '80px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 16px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '9999px',
    color: '#34D399',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '30px',
    boxShadow: '0 0 20px rgba(16, 185, 129, 0.1)',
  },
  pulse: {
    width: '8px',
    height: '8px',
    background: '#34D399',
    borderRadius: '50%',
    marginRight: '10px',
    boxShadow: '0 0 10px #34D399',
    animation: 'pulse 2s infinite',
  },
  title: {
    fontSize: 'clamp(40px, 6vw, 64px)',
    fontWeight: '800',
    lineHeight: '1.1',
    letterSpacing: '-0.02em',
    marginBottom: '24px',
    color: '#FFFFFF',
  },
  highlight: {
    background: 'linear-gradient(135deg, #38BDF8 0%, #818CF8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: 'clamp(16px, 2vw, 20px)',
    lineHeight: '1.6',
    color: '#9CA3AF',
    marginBottom: '48px',
    maxWidth: '650px',
  },
  buttonContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 40px',
    fontSize: '20px',
    fontWeight: '700',
    color: '#FFFFFF',
    background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 100%)',
    border: '1px solid rgba(147, 197, 253, 0.3)',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 30px -10px rgba(56, 189, 248, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
    width: '100%',
    maxWidth: '400px',
  },
  buttonLoading: {
    opacity: 0.8,
    cursor: 'not-allowed',
    transform: 'none',
  },
  spinner: {
    border: '3px solid rgba(255,255,255,0.3)',
    borderTop: '3px solid #FFFFFF',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    animation: 'spin 1s linear infinite',
  },
  errorText: {
    color: '#EF4444',
    marginTop: '16px',
    fontSize: '14px',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    width: '100%',
    marginTop: '40px',
  },
  featureCard: {
    background: 'rgba(17, 24, 39, 0.6)',
    border: '1px solid rgba(55, 65, 81, 0.5)',
    borderRadius: '20px',
    padding: '32px',
    backdropFilter: 'blur(10px)',
    transition: 'transform 0.3s ease, border-color 0.3s ease',
  },
  iconBox: {
    width: '50px',
    height: '50px',
    background: 'rgba(31, 41, 55, 0.8)',
    border: '1px solid rgba(75, 85, 99, 0.6)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    marginBottom: '20px',
  },
  featureTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: '12px',
  },
  featureDesc: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#9CA3AF',
  },
  footer: {
    textAlign: 'center',
    padding: '30px',
    borderTop: '1px solid rgba(31, 41, 55, 0.5)',
    color: '#9CA3AF',
    fontSize: '14px',
    position: 'relative',
    zIndex: 1,
    background: '#030712',
  },
};

// Required for the pulse and spin animations
const globalStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(52, 211, 153, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
  }
  button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px -10px rgba(56, 189, 248, 0.5), inset 0 1px 0 rgba(255,255,255,0.3);
    border-color: rgba(147, 197, 253, 0.6);
  }
  button:active:not(:disabled) {
    transform: translateY(0);
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = globalStyles;
  document.head.appendChild(style);
}
