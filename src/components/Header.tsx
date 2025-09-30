"use client";

import { NotificationBell } from './NotificationBell';

export function Header() {
    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-4 border-b bg-background px-6">
            <NotificationBell />
        </header>
    );
}
