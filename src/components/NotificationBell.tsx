"use client";

import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationPanel } from './NotificationPanel';

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const { unreadCount, markAllAsRead } = useNotifications();

    const handleToggle = () => {
        if (!isOpen && unreadCount > 0) {
            markAllAsRead();
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative">
            <button
                onClick={handleToggle}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <NotificationPanel onClose={() => setIsOpen(false)} />
            )}
        </div>
    );
}
