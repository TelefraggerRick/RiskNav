
"use client"; 

import Link from 'next/link';
import { ShieldHalf, UserCircle, BarChart3, LogOut, Users, LogIn, CalendarDays, UserCog, Workflow, LayoutGrid, ChevronDown, Settings, Loader2 } from 'lucide-react'; // Added Settings, Loader2
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext'; 
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import React, { useState, useEffect } from 'react';
import { rtdb } from '@/lib/firebase'; 
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database'; 
import { cn } from '@/lib/utils';

interface OnlineUser {
  uid: string;
  name?: string;
  isOnline: boolean;
  lastChanged: number;
}

export default function Header() {
  const { currentUser, logout, isLoadingAuth } = useUser(); 
  const { currentLanguage, toggleLanguage, getTranslation } = useLanguage(); 
  const [onlineUsersCount, setOnlineUsersCount] = useState<number | null>(null);
  const [onlineUserList, setOnlineUserList] = useState<OnlineUser[]>([]);
  const [isLoadingOnlineList, setIsLoadingOnlineList] = useState(false);

  useEffect(() => {
    if (rtdb) { 
      const statusRef = ref(rtdb, '/status');
      const unsubscribeTotal = onValue(statusRef, (snapshot) => {
        const statuses = snapshot.val();
        if (statuses) {
          const count = Object.values(statuses).filter((status: any) => status.isOnline).length;
          setOnlineUsersCount(count);
        } else {
          setOnlineUsersCount(0);
        }
      });
      return () => unsubscribeTotal(); 
    } else {
      console.warn("Header: RTDB not available, online user count feature disabled.");
      setOnlineUsersCount(null); 
    }
  }, []);

  const fetchOnlineUsers = () => {
    if (!rtdb) return;
    setIsLoadingOnlineList(true);
    const onlineUsersQuery = query(ref(rtdb, '/status'), orderByChild('isOnline'), equalTo(true));
    const unsubscribeList = onValue(onlineUsersQuery, (snapshot) => {
      const usersData = snapshot.val();
      if (usersData) {
        const usersArray = Object.entries(usersData).map(([uid, data]) => ({
          uid,
          ...(data as Omit<OnlineUser, 'uid'>),
        }));
        setOnlineUserList(usersArray);
      } else {
        setOnlineUserList([]);
      }
      setIsLoadingOnlineList(false);
    }, (error) => {
        console.error("Error fetching online user list:", error);
        setIsLoadingOnlineList(false);
        setOnlineUserList([]);
    });
    // Note: This unsubscribe is for a one-time fetch logic. 
    // If this popover is opened/closed frequently, this might re-subscribe.
    // For a persistent listener, you'd manage unsubscribe differently.
    // For this popover use case, fetching on open is reasonable.
    // We return the unsubscribe function so Popover's onOpenChange can call it if it were to manage it.
    // However, typically onValue provides continuous updates, so it's tricky to "unsubscribe" cleanly after first fetch inside popover.
    // A get() might be better if it's truly a one-time fetch on open, but onValue is simpler for live updates if popover stays open.
    // For simplicity here, just fetching on popover open.
  };


  const getInitials = (name?: string) => {
    if (!name || name === 'No User Selected' || name === 'Anonymous') return 'NU';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const T = {
    riskNav: { en: "RiskNav", fr: "NavRisques" },
    dashboard: { en: "Dashboard", fr: "Tableau de bord" },
    statistics: { en: "Statistics", fr: "Statistiques" },
    calendar: { en: "Calendar", fr: "Calendrier" }, 
    workflowStatus: { en: "Workflow Status", fr: "État du flux" },
    newAssessment: { en: "New Assessment", fr: "Nouvelle évaluation" },
    admin: { en: "Admin", fr: "Admin" }, 
    userSettings: { en: "Settings", fr: "Paramètres" },
    login: { en: "Login", fr: "Connexion" },
    logout: { en: "Log Out", fr: "Déconnexion" },
    french: { en: "Français", fr: "English" },
    onlineUsers: { en: "Online Users", fr: "Utilisateurs en ligne" },
    viewsMenu: { en: "Views", fr: "Vues" },
    noUsersOnline: { en: "No users currently online.", fr: "Aucun utilisateur actuellement en ligne." },
    loadingOnlineUsers: { en: "Loading online users...", fr: "Chargement des utilisateurs en ligne..."}
  };

  const userIsAuthenticated = currentUser && currentUser.uid !== 'user-unauth';
  const isAdmin = userIsAuthenticated && currentUser.role === 'Admin';

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b bg-card shadow-sm", "print-hide")}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-12 items-center justify-end border-b border-border">
          {/* Removed Government of Canada logo and text div */}
          <div className="flex items-center gap-3">
            {onlineUsersCount !== null && (
              <Popover onOpenChange={(open) => { if (open) fetchOnlineUsers(); else setOnlineUserList([]);}}>
                <PopoverTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-primary" title={getTranslation(T.onlineUsers)}>
                    <Users className="h-3 w-3 text-green-500" />
                    <span>{onlineUsersCount}</span>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none text-sm">{getTranslation(T.onlineUsers)}</h4>
                    {isLoadingOnlineList ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-xs text-muted-foreground">{getTranslation(T.loadingOnlineUsers)}</span>
                      </div>
                    ) : onlineUserList.length > 0 ? (
                      <ul className="space-y-1 max-h-48 overflow-y-auto">
                        {onlineUserList.map(user => (
                          <li key={user.uid} className="flex items-center gap-2 p-1.5 rounded-sm hover:bg-accent text-xs">
                            <Avatar className="h-5 w-5 text-xs">
                              <AvatarFallback className="bg-muted text-muted-foreground text-[0.6rem]">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{user.name || 'Anonymous User'}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">{getTranslation(T.noUsersOnline)}</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
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
                  <DropdownMenuItem asChild>
                     <Link href="/user-settings" className="flex items-center w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>{getTranslation(T.userSettings)}</span>
                    </Link>
                  </DropdownMenuItem>
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
    
