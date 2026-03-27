'use client';

/**
 * OMNI-CRM Sidebar Navigation
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Wallet,
  Briefcase,
  TrendingUp,
  Settings,
  Bell,
  Shield,
  FileText,
  Network,
  BarChart3,
  ChevronDown,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  children?: { title: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Tasks',
    href: '/tasks',
    icon: CheckSquare,
    badge: 12,
    children: [
      { title: 'All Tasks', href: '/tasks' },
      { title: 'My Tasks', href: '/tasks?assigned=me' },
      { title: 'Overdue', href: '/tasks?overdue=true' },
      { title: 'SLA Breached', href: '/tasks?sla=true' },
    ],
  },
  {
    title: 'Clients',
    href: '/clients',
    icon: Users,
    badge: 5,
    children: [
      { title: 'All Clients', href: '/clients' },
      { title: 'KYC Pending', href: '/clients?kyc=pending' },
      { title: 'New Registrations', href: '/clients?new=true' },
    ],
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: Wallet,
    badge: 8,
    children: [
      { title: 'Deposits', href: '/transactions?type=deposit' },
      { title: 'Withdrawals', href: '/transactions?type=withdrawal' },
      { title: 'Pending', href: '/transactions?status=pending' },
    ],
  },
  {
    title: 'Trading Accounts',
    href: '/accounts',
    icon: Briefcase,
    children: [
      { title: 'All Accounts', href: '/accounts' },
      { title: 'A-Book', href: '/accounts?book=a' },
      { title: 'B-Book', href: '/accounts?book=b' },
    ],
  },
  {
    title: 'IB Network',
    href: '/ib',
    icon: Network,
    children: [
      { title: 'All IBs', href: '/ib' },
      { title: 'Commissions', href: '/ib/commissions' },
      { title: 'Referral Links', href: '/ib/links' },
    ],
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    children: [
      { title: 'A/B Book', href: '/analytics/ab-book' },
      { title: 'Revenue', href: '/analytics/revenue' },
      { title: 'Risk', href: '/analytics/risk' },
    ],
  },
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
    badge: 3,
  },
  {
    title: 'Audit Logs',
    href: '/audit',
    icon: FileText,
  },
  {
    title: 'Security',
    href: '/security',
    icon: Shield,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Tasks', 'Clients']);

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]
    );
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          OM
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-lg">OMNI-CRM</span>
          <span className="text-xs text-muted-foreground">Tier-1 Brokerage</span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const isExpanded = expandedItems.includes(item.title);

            return (
              <div key={item.title}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleExpand(item.title)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
                      />
                    </button>
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-border pl-4">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                              pathname === child.href
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    {item.badge && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Menu */}
      <div className="border-t border-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatar.png" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium">Admin User</span>
                <span className="text-xs text-muted-foreground">Super Admin</span>
              </div>
              <ChevronDown className="ml-auto h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
