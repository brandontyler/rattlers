import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  confirmSignup: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Only initialize Cognito if credentials are available (not placeholder values)
const hasCognitoConfig =
  import.meta.env.VITE_COGNITO_USER_POOL_ID &&
  import.meta.env.VITE_COGNITO_CLIENT_ID &&
  !import.meta.env.VITE_COGNITO_USER_POOL_ID.includes('TBD') &&
  !import.meta.env.VITE_COGNITO_CLIENT_ID.includes('TBD');

const userPool = hasCognitoConfig ? new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
}) : null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      if (!userPool) {
        console.warn('Cognito not configured - auth features disabled');
        setIsLoading(false);
        return;
      }
      const currentUser = userPool.getCurrentUser();
      if (currentUser) {
        currentUser.getSession(async (err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session || !session.isValid()) {
            setUser(null);
            localStorage.removeItem('authToken');
            setIsLoading(false);
            return;
          }

          // Store token
          const token = session.getIdToken().getJwtToken();
          localStorage.setItem('authToken', token);

          // Extract user info from token payload
          const payload = session.getIdToken().payload;
          setUser({
            id: payload.sub,
            email: payload.email,
            name: payload.name || undefined,
            isAdmin: (payload['cognito:groups'] || []).includes('Admins'),
          });

          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    if (!userPool) {
      throw new Error('Authentication not configured');
    }
    return new Promise((resolve, reject) => {
      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: async (session) => {
          const token = session.getIdToken().getJwtToken();
          localStorage.setItem('authToken', token);

          // Extract user info from token payload
          const payload = session.getIdToken().payload;
          setUser({
            id: payload.sub,
            email: payload.email,
            name: payload.name || undefined,
            isAdmin: (payload['cognito:groups'] || []).includes('Admins'),
          });
          resolve();
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    });
  };

  const signup = async (email: string, password: string, name?: string): Promise<void> => {
    if (!userPool) {
      throw new Error('Authentication not configured');
    }
    return new Promise((resolve, reject) => {
      const attributeList: CognitoUserAttribute[] = [];

      if (name) {
        attributeList.push(
          new CognitoUserAttribute({
            Name: 'name',
            Value: name,
          })
        );
      }

      userPool.signUp(email, password, attributeList, [], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  };

  const confirmSignup = async (email: string, code: string): Promise<void> => {
    if (!userPool) {
      throw new Error('Authentication not configured');
    }
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.confirmRegistration(code, true, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  };

  const resendConfirmationCode = async (email: string): Promise<void> => {
    if (!userPool) {
      throw new Error('Authentication not configured');
    }
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.resendConfirmationCode((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  };

  const logout = async (): Promise<void> => {
    if (userPool) {
      const currentUser = userPool.getCurrentUser();
      if (currentUser) {
        currentUser.signOut();
      }
    }
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    confirmSignup,
    resendConfirmationCode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
