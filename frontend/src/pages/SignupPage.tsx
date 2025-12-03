import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Card } from '@/components/ui';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signup, confirmSignup, resendConfirmationCode } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signup(email, password, name);
      setNeedsConfirmation(true);
    } catch (err: any) {
      setError(err.message || 'Failed to sign up. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await confirmSignup(email, confirmationCode);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm account');
    } finally {
      setIsLoading(false);
    }
  };

  // Success State
  if (success) {
    return (
      <div className="min-h-[calc(100vh-300px)] flex items-center justify-center px-4 py-12 animate-fade-in">
        <Card className="max-w-md w-full text-center p-12">
          <div className="w-20 h-20 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-display text-3xl font-bold text-forest-900 mb-4">
            Account Confirmed!
          </h2>
          <p className="text-forest-600 mb-8">
            Your account has been successfully created. You can now login and start exploring Christmas lights in DFW!
          </p>
          <Link to="/login">
            <Button variant="gold" size="lg" fullWidth>
              Go to Login
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Confirmation State
  if (needsConfirmation) {
    return (
      <div className="min-h-[calc(100vh-300px)] flex items-center justify-center px-4 py-12 animate-fade-in">
        <Card className="max-w-md w-full p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
            </div>
            <h2 className="font-display text-3xl font-bold text-forest-900 mb-2">
              Check Your Email
            </h2>
            <p className="text-forest-600">
              We've sent a confirmation code to<br />
              <span className="font-semibold">{email}</span>
            </p>
          </div>

          {error && (
            <div className="bg-burgundy-50 border-2 border-burgundy-200 text-burgundy-800 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
              <svg className="w-5 h-5 text-burgundy-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleConfirm} className="space-y-6">
            <Input
              label="Confirmation Code"
              type="text"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              required
            />

            <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
              {isLoading ? 'Confirming...' : 'Confirm Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={async () => {
                try {
                  await resendConfirmationCode(email);
                  setError('');
                  alert('Confirmation code resent!');
                } catch (err: any) {
                  setError(err.message || 'Failed to resend code');
                }
              }}
              className="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
            >
              Resend code
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Signup Form State
  return (
    <div className="min-h-[calc(100vh-300px)] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Right Column - Signup Form (appears first on mobile) */}
        <div className="order-2 lg:order-1">
          <Card className="p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="inline-block mb-4">
                <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
              </div>
              <h1 className="font-display text-3xl font-bold text-forest-900 mb-2">
                Create Your Account
              </h1>
              <p className="text-forest-600">
                Join our community and start exploring!
              </p>
            </div>

            {error && (
              <div className="bg-burgundy-50 border-2 border-burgundy-200 text-burgundy-800 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
                <svg className="w-5 h-5 text-burgundy-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-6">
              <Input
                label="Full Name (optional)"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
              />

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                helperText="At least 8 characters with uppercase, lowercase, and number"
                required
              />

              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-1 text-burgundy-600 border-forest-300 rounded focus:ring-forest-500"
                    required
                  />
                  <span className="text-sm text-forest-700">
                    I agree to the{' '}
                    <a href="#" className="text-burgundy-600 hover:text-burgundy-700 font-medium">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-burgundy-600 hover:text-burgundy-700 font-medium">
                      Privacy Policy
                    </a>
                  </span>
                </label>
              </div>

              <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-forest-600">
                Already have an account?{' '}
                <Link to="/login" className="text-burgundy-600 hover:text-burgundy-700 font-semibold">
                  Login instead
                </Link>
              </p>
            </div>

          </Card>
        </div>

        {/* Left Column - Benefits (appears second on mobile) */}
        <div className="order-1 lg:order-2">
          <div className="relative">
            <div className="absolute -top-4 -right-4 text-6xl animate-pulse-soft">⭐</div>
            <div className="absolute -bottom-4 -left-4 text-5xl animate-pulse-soft" style={{ animationDelay: '1s' }}>✨</div>

            <Card className="gradient-forest text-white p-12 shadow-xl">
              <h2 className="font-display text-4xl font-bold mb-6 text-white">
                Join Our Community
              </h2>
              <p className="text-xl text-white/95 mb-8 leading-relaxed">
                Share your favorite displays and help families create magical holiday memories together.
              </p>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg text-white mb-1">
                      Share & Review
                    </h3>
                    <p className="text-white/90">
                      Leave positive feedback and help others discover amazing displays
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg text-white mb-1">
                      Plan Routes
                    </h3>
                    <p className="text-white/90">
                      Create custom tours and save your favorite locations
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg text-white mb-1">
                      Build Community
                    </h3>
                    <p className="text-white/90">
                      Connect with other families and spread holiday cheer
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
