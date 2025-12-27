import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import type { User, AdminGroup, UserPermissions } from '@/types';
import { apiService } from '@/services/api';

// Permission group definitions (must match backend)
const SUPER_ADMIN_GROUPS: AdminGroup[] = ['NorthPoleCouncil', 'Admins'];

function computePermissions(groups: AdminGroup[]): UserPermissions {
  const hasGroup = (allowed: AdminGroup[]) => groups.some(g => allowed.includes(g));

  return {
    canApprove: hasGroup(['NorthPoleCouncil', 'Admins', 'SantasHelpers']),
    canEdit: hasGroup(['NorthPoleCouncil', 'Admins', 'WorkshopElves']),
    canModerate: hasGroup(['NorthPoleCouncil', 'Admins', 'ChimneySweeps']),
    canReject: hasGroup(['NorthPoleCouncil', 'Admins', 'SantasHelpers', 'ChimneySweeps']),
    canDelete: hasGroup(['NorthPoleCouncil', 'Admins']),
    canViewAdmin: hasGroup(['NorthPoleCouncil', 'Admins', 'SantasHelpers', 'WorkshopElves', 'ChimneySweeps']),
  };
}

function createUserFromPayload(payload: Record<string, unknown>): User {
  const rawGroups = (payload['cognito:groups'] || []) as string[];
  const groups = rawGroups.filter((g): g is AdminGroup =>
    ['NorthPoleCouncil', 'SantasHelpers', 'WorkshopElves', 'ChimneySweeps', 'Admins'].includes(g)
  );
  const permissions = computePermissions(groups);
  const isAdmin = groups.some(g => SUPER_ADMIN_GROUPS.includes(g));

  return {
    id: payload.sub as string,
    email: payload.email as string,
    name: (payload.name as string) || undefined,
    isAdmin,
    groups,
    permissions,
  };
}

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

  const fetchUserProfile = async (baseUser: User): Promise<User> => {
    try {
      // Fetch full profile including username
      const response = await apiService.getUserProfile();
      if (response.success && response.data) {
        return {
          ...baseUser,
          username: response.data.username,
        };
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
    return baseUser;
  };

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
          const baseUser = createUserFromPayload(payload);

          // Fetch username from API
          const fullUser = await fetchUserProfile(baseUser);
          setUser(fullUser);

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
          const baseUser = createUserFromPayload(payload);

          // Fetch username from API
          const fullUser = await fetchUserProfile(baseUser);
          setUser(fullUser);

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
