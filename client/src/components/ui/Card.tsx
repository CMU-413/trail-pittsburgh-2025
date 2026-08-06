// src/components/ui/Card.tsx
import React from 'react';

interface CardProps {
    id?: string;
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    headerAction?: React.ReactNode;
    footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
    title,
    subtitle,
    children,
    className = '',
    headerAction,
    footer
}) => {
    return (
        <article className={`bg-white rounded-lg shadow-md overflow-hidden flex flex-col ${className}`}>
            {(title || subtitle || headerAction) && (
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
                            {subtitle && <p className="mt-1 max-w-2xl text-sm text-gray-500">{subtitle}</p>}
                        </div>
                        {headerAction && <div>{headerAction}</div>}
                    </div>
                </div>
            )}
            {children && (
                <div className="px-4 py-5 sm:p-6 bg-white flex-1">
                    {children}
                </div>
            )}
            {footer && (
                <footer className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200">
                    {footer}
                </footer>
            )}
        </article>
    );
};
