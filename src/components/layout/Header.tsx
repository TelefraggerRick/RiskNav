
"use client"; 

import Link from 'next/link';
import { ShieldHalf, UserCircle, BarChart3, LogOut, Users, LogIn, CalendarDays, UserCog, Workflow, LayoutGrid, ChevronDown } from 'lucide-react'; // Added LayoutGrid, ChevronDown
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext'; 
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import React, { useState, useEffect } from 'react';
import { rtdb } from '@/lib/firebase'; 
import { ref, onValue } from 'firebase/database'; 
import { cn } from '@/lib/utils';

export default function Header() {
  const { currentUser, logout, isLoadingAuth } = useUser(); 
  const { currentLanguage, toggleLanguage, getTranslation } = useLanguage(); 
  const [onlineUsersCount, setOnlineUsersCount] = useState<number | null>(null);

  useEffect(() => {
    if (rtdb) { 
      const statusRef = ref(rtdb, '/status');
      const unsubscribe = onValue(statusRef, (snapshot) => {
        const statuses = snapshot.val();
        if (statuses) {
          const count = Object.values(statuses).filter((status: any) => status.isOnline).length;
          setOnlineUsersCount(count);
        } else {
          setOnlineUsersCount(0);
        }
      });
      return () => unsubscribe(); 
    } else {
      console.warn("Header: RTDB not available, online user count feature disabled.");
      setOnlineUsersCount(null); 
    }
  }, []);


  const getInitials = (name: string) => {
    if (!name || name === 'No User Selected') return 'NU';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const T = {
    govCanada: { en: "Government of Canada", fr: "Gouvernement du Canada" },
    riskNav: { en: "RiskNav", fr: "NavRisques" },
    dashboard: { en: "Dashboard", fr: "Tableau de bord" },
    statistics: { en: "Statistics", fr: "Statistiques" },
    calendar: { en: "Calendar", fr: "Calendrier" }, 
    workflowStatus: { en: "Workflow Status", fr: "État du flux" },
    newAssessment: { en: "New Assessment", fr: "Nouvelle évaluation" },
    admin: { en: "Admin", fr: "Admin" }, 
    login: { en: "Login", fr: "Connexion" },
    logout: { en: "Log Out", fr: "Déconnexion" },
    french: { en: "Français", fr: "English" },
    onlineUsers: { en: "Online", fr: "En ligne" },
    viewsMenu: { en: "Views", fr: "Vues" }, // New translation for the dropdown
  };

  const userIsAuthenticated = currentUser && currentUser.uid !== 'user-unauth';
  const isAdmin = userIsAuthenticated && currentUser.role === 'Admin';

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b bg-card shadow-sm", "print-hide")}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-12 items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-primary flex items-center justify-center rounded-sm">
              <span className="text-xs font-bold text-primary-foreground">C</span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              {getTranslation(T.govCanada)} / <span className="font-normal">{currentLanguage === 'en' ? T.govCanada.fr : T.govCanada.en}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {onlineUsersCount !== null && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground" title={getTranslation(T.onlineUsers)}>
                <Users className="h-3 w-3 text-green-500" />
                <span>{onlineUsersCount}</span>
              </div>
            )}
            <Button variant="link" size="sm" className="text-sm text-foreground hover:text-primary h-auto p-0" onClick={toggleLanguage}>
              {getTranslation(T.french)}
            </Button>
          </div>
        </div>

        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-primary">
            <ShieldHalf className="h-7 w-7" />
            <span className="font-bold">{getTranslation(T.riskNav)}</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/" passHref>
              <Button variant="ghost" className="text-sm sm:text-base text-foreground hover:bg-accent hover:text-accent-foreground">{getTranslation(T.dashboard)}</Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm sm:text-base text-foreground hover:bg-accent hover:text-accent-foreground">
                  <LayoutGrid className="h-4 w-4 mr-0 sm:mr-2" />
                  <span className="hidden sm:inline">{getTranslation(T.viewsMenu)}</span>
                  <ChevronDown className="h-4 w-4 ml-1 hidden sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/workflow-status" className="flex items-center w-full">
                    <Workflow className="h-4 w-4 mr-2" />
                    {getTranslation(T.workflowStatus)}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/statistics" className="flex items-center w-full">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {getTranslation(T.statistics)}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/calendar" className="flex items-center w-full">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {getTranslation(T.calendar)}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isAdmin && (
                 <Link href="/admin" passHref>
                    <Button variant="ghost" className="text-sm sm:text-base text-foreground hover:bg-accent hover:text-accent-foreground">
                         <UserCog className="h-4 w-4 mr-0 sm:mr-2" />
                        <span className="hidden sm:inline">{getTranslation(T.admin)}</span>
                    </Button>
                </Link>
            )}
            {userIsAuthenticated && (
                 <Link href="/assessments/new" passHref>
                    <Button variant="default" className="text-sm sm:text-base">{getTranslation(T.newAssessment)}</Button>
                </Link>
            )}

            {isLoadingAuth ? (
              <Button variant="outline" disabled>
                <UserCircle className="mr-2 h-4 w-4 animate-pulse" /> Loading...
              </Button>
            ) : !userIsAuthenticated ? (
              <Link href="/login" passHref>
                <Button variant="outline">
                  <LogIn className="mr-2 h-4 w-4" />
                  {getTranslation(T.login)}
                </Button>
              </Link>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="User Profile" className="text-foreground hover:bg-accent hover:text-accent-foreground">
                    <Avatar className="h-7 w-7 text-xs">
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {getInitials(currentUser.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    {currentUser.name}
                    <p className="text-xs text-muted-foreground font-normal">{currentUser.role}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{getTranslation(T.logout)}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
    
