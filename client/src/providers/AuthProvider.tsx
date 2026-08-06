import React, {
    createContext, useEffect, useState, useContext, useRef
} from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { UserRoleEnum } from '../types/index';
import { SESSION_TIMEOUT_MS } from '../constants/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
    login: (redirectPath?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: UserRoleEnum | null;
  userRole: UserRoleEnum | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<UserRoleEnum | null>(null);
    const navigate = useNavigate();
    const logoutTimer = useRef<number | null>(null);

    // Fetch current user on mount
    useEffect(() => {
        fetchCurrentUser();
    }, []);

    // Fetch current user from backend
    const fetchCurrentUser = async () => {
        try {
            const res = await fetch(`/api/auth/me`, {
                credentials: 'include'
            });
            
            if (!res.ok) {
                setUser(null);
                return;
            }
            
            const data = await res.json();
            if (data?.user) {
                setUser(data.user);

                const role = data.user.role;

                if (role) {
                    setUserRole(role);
                }
            } else {
                setUser(null);
                setUserRole(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    // Start OAuth flow
    const login = async (redirectPath?: string) => {
        try {
            const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            const res = await fetch(`/api/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ redirectPath: redirectPath ?? currentPath })
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Login failed', error);
        }
    };

    // Logout user
    const logout = async () => {
        try {
            await fetch(`/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            setUser(null);
            setUserRole(null);
            navigate('/');
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Logout failed', error);
        }
    };

    // setTimeout delays are capped at a signed 32-bit int (~24.8 days), so a
    // longer inactivity window has to be scheduled in chunks against a deadline.
    const MAX_TIMEOUT_MS = 2_147_483_647;

    const scheduleLogout = (remainingMs: number) => {
        const delay = Math.min(remainingMs, MAX_TIMEOUT_MS);
        logoutTimer.current = window.setTimeout(() => {
            const leftMs = remainingMs - delay;
            if (leftMs > 0) {
                scheduleLogout(leftMs);
            } else {
                logout();
            }
        }, delay);
    };

    const resetTimer = () => {
        if (logoutTimer.current) {
            clearTimeout(logoutTimer.current);
        }

        scheduleLogout(SESSION_TIMEOUT_MS);
    };

    const isAuthenticated = !!user;
    const hasPermission = userRole;

    useEffect(() => {
        if (!isAuthenticated) {return;}

        const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];

        const handleActivity = () => {
            resetTimer();
        };

        // Listern for any active activity and reset timer when detected
        events.forEach((event) => {
            window.addEventListener(event, handleActivity);
        });

        // start timer initially
        resetTimer();

        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });

            if (logoutTimer.current) {
                clearTimeout(logoutTimer.current);
            }
        };
    }, [isAuthenticated]);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated, hasPermission, userRole }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {throw new Error('useAuth must be used within an AuthProvider');}
    return context;
};
