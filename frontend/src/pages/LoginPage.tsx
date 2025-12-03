import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Card } from '@/components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const { login, confirmSignup, resendConfirmationCode } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      if (err.message?.includes('not confirmed') || err.code === 'UserNotConfirmedException') {
        setNeedsConfirmation(true);
        try {
          await resendConfirmationCode(email);
        } catch {}
      }
      setError(err.message || 'Failed to login. Please try again.');
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
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to confirm account');
    } finally {
      setIsLoading(false);
    }
  };

  if (needsConfirmation) {
    return (
      <div className="min-h-[calc(100vh-300px)] flex items-center justify-center px-4 py-12 animate-fade-in">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📧</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-forest-900 mb-2">
              Confirm Your Email
            </h2>
            <p className="text-forest-600 text-sm">
              We've sent a confirmation code to<br />
              <span className="font-semibold">{email}</span>
            </p>
          </div>

          {error && (
            <div className="bg-burgundy-50 border border-burgundy-200 text-burgundy-800 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleConfirm} className="space-y-4">
            <Input
              label="Confirmation Code"
              type="text"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              required
            />
            <Button type="submit" variant="primary" fullWidth loading={isLoading}>
              {isLoading ? 'Confirming...' : 'Confirm & Login'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={async () => {
                try {
                  await resendConfirmationCode(email);
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

  return (
    <div className="min-h-[calc(100vh-300px)] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Column - Welcome Message */}
        <div className="hidden lg:block">
          <div className="relative">
            <div className="absolute -top-4 -left-4 text-6xl animate-pulse-soft">🎄</div>
            <div className="absolute -bottom-4 -right-4 text-5xl animate-pulse-soft" style={{ animationDelay: '1s' }}>✨</div>

            <Card className="gradient-burgundy text-white p-12 shadow-xl">
              <h2 className="font-display text-4xl font-bold mb-6 text-white">
                Welcome Back!
              </h2>
              <p className="text-xl text-white/95 mb-6 leading-relaxed">
                Login to share your favorite Christmas light displays and create magical routes for your family.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-white/90">Save your favorite locations</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-white/90">Share reviews with the community</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-white/90">Plan custom holiday tours</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column - Login Form */}
        <div>
          <Card className="p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="inline-block mb-4">
                <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </div>
              </div>
              <h1 className="font-display text-3xl font-bold text-forest-900 mb-2">
                Login to Your Account
              </h1>
              <p className="text-forest-600">
                Welcome back! Please enter your details.
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

            <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Enter your password"
                required
              />

              <div className="flex justify-end text-sm">
                <Link to="/forgot-password" className="text-burgundy-600 hover:text-burgundy-700 font-medium">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-forest-600">
                Don't have an account?{' '}
                <Link to="/signup" className="text-burgundy-600 hover:text-burgundy-700 font-semibold">
                  Sign up for free
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
