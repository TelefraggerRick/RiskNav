
"use client"; 

import Link from 'next/link';
import { ShieldHalf, UserCircle, BarChart3, LogOut, Users, LogIn, CalendarDays } from 'lucide-react'; // Added CalendarDays
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
import React, { useState, useEffect } from 'react'; // Added useState, useEffect

export default function Header() {
  const { currentUser, availableUsers, switchUser, logout } = useUser();
  const { currentLanguage, toggleLanguage, getTranslation } = useLanguage(); 
  const [mockOnlineUsers, setMockOnlineUsers] = useState<number | null>(null);

  useEffect(() => {
    // Generate initial mock online users count and set up an interval to fluctuate it
    // This runs only on the client-side to avoid hydration issues
    const initialCount = Math.floor(Math.random() * (15 - 5 + 1)) + 5; // Random between 5 and 15
    setMockOnlineUsers(initialCount);

    const intervalId = setInterval(() => {
      setMockOnlineUsers(prevCount => {
        if (prevCount === null) return initialCount;
        const change = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        const newCount = prevCount + change;
        return Math.max(3, Math.min(20, newCount)); // Keep between 3 and 20
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, []);


  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length > 1) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return name.substring(0, 2).toUpperCase();
  };

  const T = {
    govCanada: { en: "Government of Canada", fr: "Gouvernement du Canada" },
    riskNav: { en: "RiskNav", fr: "NavRisques" },
    dashboard: { en: "Dashboard", fr: "Tableau de bord" },
    statistics: { en: "Statistics", fr: "Statistiques" },
    calendar: { en: "Calendar", fr: "Calendrier" }, 
    newAssessment: { en: "New Assessment", fr: "Nouvelle évaluation" },
    login: { en: "Login", fr: "Connexion" },
    logout: { en: "Log Out", fr: "Déconnexion" },
    switchUser: { en: "Switch User (Dev)", fr: "Changer d'utilisateur (Dev)" },
    french: { en: "Français", fr: "English" },
    onlineUsers: { en: "Online", fr: "En ligne" },
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 md:px-6">
        {/* Top bar mimicking Canada.ca */}
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
            {mockOnlineUsers !== null && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground" title={getTranslation(T.onlineUsers)}>
                <Users className="h-3 w-3 text-green-500" />
                <span>{mockOnlineUsers}</span>
              </div>
            )}
            <Button variant="link" size="sm" className="text-sm text-foreground hover:text-primary h-auto p-0" onClick={toggleLanguage}>
              {getTranslation(T.french)}
            </Button>
          </div>
        </div>

        {/* Main app header content */}
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-primary">
            <ShieldHalf className="h-7 w-7" />
            <span className="font-bold">{getTranslation(T.riskNav)}</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/" passHref>
              <Button variant="ghost" className="text-sm sm:text-base text-foreground hover:bg-accent hover:text-accent-foreground">{getTranslation(T.dashboard)}</Button>
            </Link>
            <Link href="/statistics" passHref>
              <Button variant="ghost" className="text-sm sm:text-base text-foreground hover:bg-accent hover:text-accent-foreground">
                <BarChart3 className="h-4 w-4 mr-0 sm:mr-2" />
                <span className="hidden sm:inline">{getTranslation(T.statistics)}</span>
              </Button>
            </Link>
            <Link href="/calendar" passHref> 
              <Button variant="ghost" className="text-sm sm:text-base text-foreground hover:bg-accent hover:text-accent-foreground">
                <CalendarDays className="h-4 w-4 mr-0 sm:mr-2" />
                <span className="hidden sm:inline">{getTranslation(T.calendar)}</span>
              </Button>
            </Link>
            {currentUser.id !== 'user-unauth' && (
                 <Link href="/assessments/new" passHref>
                    <Button variant="default" className="text-sm sm:text-base">{getTranslation(T.newAssessment)}</Button>
                </Link>
            )}

            {currentUser.id === 'user-unauth' ? (
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
                  <DropdownMenuLabel className="text-xs font-normal">{getTranslation(T.switchUser)}</DropdownMenuLabel>
                  {availableUsers.filter(u => u.id !== 'user-unauth' && u.id !== currentUser.id).map(user => (
                    <DropdownMenuItem key={user.id} onClick={() => switchUser(user.id)}>
                      <Users className="mr-2 h-4 w-4" />
                      <span>{user.name}</span>
                    </DropdownMenuItem>
                  ))}
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
