// src/components/layout/Header.tsx
import React, { useState, useEffect } from 'react';
import {
    Link, useLocation, useNavigate
} from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { APP_NAME } from '../../constants/config';
import { UserRoleEnum } from '../../types/index';
import { formatUserRole } from '../../utils/formatters';
import { triggerAuth } from '../../utils/auth';
import trailPghBadge from '../../assets/TrailPGHbadge.png';

export const Header: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Get auth context
    const { user, isAuthenticated, hasPermission, logout, userRole } = useAuth();

    // Handle scroll effect for header
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close profile dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (isProfileOpen && !target.closest('.profile-dropdown')) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileOpen]);

    // Navigation links for public
    const publicNavigation = [
        { name: 'Home', href: '/', current: location.pathname === '/' },
        { name: 'Issue Map', href: '/issues', current: location.pathname.startsWith('/issues') && location.pathname !== '/issues/report' },
    ];

    // Navigation links for admins
    const adminNavigation = [
        { name: 'Dashboard', href: '/parks', current: location.pathname.startsWith('/parks') },
    ];

    // Navigation links for super admins
    const superAdminNavigation = [
        { name: 'Users', href: '/users', current: location.pathname.startsWith('/users') },
    ];

    // Report Issue link (public)
    const reportIssueLink = { name: 'Report Issue', href: '/issues/report', current: location.pathname === '/issues/report' };

    // Determine which navigation to use
    const navigation = () => {
        if (!hasPermission) {
            return [...publicNavigation, reportIssueLink];
        } else if (hasPermission === UserRoleEnum.ROLE_ADMIN) {
            return [...publicNavigation, ...adminNavigation, reportIssueLink];
        } else if (hasPermission === UserRoleEnum.ROLE_SUPERADMIN) {
            return [...publicNavigation, ...adminNavigation, ...superAdminNavigation, reportIssueLink];
        } else {
            return [...publicNavigation, reportIssueLink];
        }
    };

    // Handle profile actions
    const handleLogout = () => {
        setIsProfileOpen(false);
        logout();
        navigate('/');
    };

    return (
        <nav className={`fixed w-full z-10 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md' : 'bg-white/80 backdrop-blur-md'
        }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link to="/" className="flex items-center space-x-2">
                                <img
                                    src={trailPghBadge}
                                    alt="Trail Pittsburgh badge"
                                    className="h-11 w-11 object-contain"
                                />
                                <span className="text-black text-xl font-bold">{APP_NAME}</span>
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {navigation().map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`${item.current
                                        ? 'border-[#BD4602] text-[#BD4602]'
                                        : 'border-transparent text-gray-700 hover:border-gray-300 hover:text-[#BD4602]'
                                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                                    aria-current={item.current ? 'page' : undefined}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:items-center">
                        {/* Profile dropdown */}
                        <div className="ml-3 relative profile-dropdown">
                            {isAuthenticated ? (
                                <div>
                                    <button
                                        type="button"
                                        className="flex items-center space-x-3 bg-white p-1 rounded-full hover:bg-gray-50 transition-colors hover:cursor-pointer"
                                        id="user-menu-button"
                                        aria-expanded={isProfileOpen}
                                        aria-haspopup="true"
                                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    >
                                        <div className="text-right hidden md:block">
                                            <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
                                            <p className="text-xs text-gray-500 capitalize">{formatUserRole(userRole)}</p>
                                        </div>
                                        <div className="relative flex-shrink-0">
                                            <img
                                                className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                                                src={user?.picture || `https://ui-avatars.com/api/?background=random&color=fff&size=400&name=${encodeURIComponent(user?.name || 'User')}`}
                                                alt={user?.name || 'User profile'}
                                                onError={(e) => {
                                                    e.currentTarget.src = `https://ui-avatars.com/api/?background=random&color=fff&size=400&name=${encodeURIComponent(user?.name || 'User')}`;
                                                }}
                                            />
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={triggerAuth}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#BD4602] hover:bg-[#a33e02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#BD4602]"
                                >
                                    Sign in
                                </button>
                            )}

                            {/* Dropdown menu */}
                            {isProfileOpen && (
                                <div
                                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                                    role="menu"
                                    aria-orientation="vertical"
                                    aria-labelledby="user-menu-button"
                                >
                                    <div className="py-1" role="none">
                                        <Link
                                            to="/profile"
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            role="menuitem"
                                            onClick={() => setIsProfileOpen(false)}
                                        >
                                            Profile
                                        </Link>
                                        <button
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:cursor-pointer"
                                            role="menuitem"
                                            onClick={handleLogout}
                                        >
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="-mr-2 flex items-center sm:hidden">
                        <button
                            type="button"
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-[#BD4602] hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#BD4602] hover:cursor-pointer"
                            aria-expanded={isMenuOpen}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMenuOpen ? (
                                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="sm:hidden absolute w-full bg-white border-b border-gray-200 shadow-lg">
                    <div className="pt-2 pb-0 space-y-1">
                        {navigation().map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`${item.current
                                    ? 'bg-orange-50 text-[#BD4602] border-l-4 border-[#BD4602]'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-[#BD4602] hover:border-[#BD4602] border-l-4 border-transparent'
                                } block pl-3 pr-4 py-4 m-0 text-base font-medium transition-colors duration-200`}
                                aria-current={item.current ? 'page' : undefined}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>

                    {isAuthenticated ? (
                        <div className="pt-4 pb-3 border-t border-gray-200">
                            <div className="flex items-center px-4 py-2">
                                <div className="flex-shrink-0 relative">
                                    <img
                                        className="h-10 w-10 rounded-full object-cover"
                                        src={user?.picture || `https://ui-avatars.com/api/?background=random&color=fff&size=400&name=${encodeURIComponent(user?.name || 'User')}`}
                                        alt={user?.name || 'User profile'}
                                        onError={(e) => {
                                            e.currentTarget.src = `https://ui-avatars.com/api/?background=random&color=fff&size=400&name=${encodeURIComponent(user?.name || 'User')}`;
                                        }}
                                    />
                                </div>
                                <div className="ml-3">
                                    <div className="text-base font-medium text-gray-800">{user?.name}</div>
                                    <div className="text-sm font-medium text-gray-500 capitalize">{formatUserRole(userRole)}</div>
                                </div>
                            </div>

                            <div className="mt-3 space-y-1">
                                <Link
                                    to="/profile"
                                    className="block px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-[#BD4602]"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Profile
                                </Link>
                                <Link
                                    to="/settings"
                                    className="block px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-[#BD4602]"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Settings
                                </Link>
                                <button
                                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-[#BD4602] hover:cursor-pointer"
                                    onClick={handleLogout}
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="pt-4 pr-3 pb-3 pl-3 border-t border-gray-200">
                            <button
                                onClick={triggerAuth}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#BD4602] hover:bg-[#a33e02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#BD4602]"
                            >
                                Sign in
                            </button>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
};
