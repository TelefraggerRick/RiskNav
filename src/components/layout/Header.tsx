
"use client"; 

import Link from 'next/link';
import { ShieldHalf, UserCircle, BarChart3, LogOut, Users, LogIn, CalendarDays, UserCog, Workflow, LayoutGrid, ChevronDown } from 'lucide-react';
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

// Canadian Flag SVG component
const CanadaFlagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1000 500" // Correct 2:1 aspect ratio for Canadian flag
    {...props}
  >
    <rect width="1000" height="500" fill="#D8262C" /> {/* Red background */}
    <rect x="250" width="500" height="500" fill="#FFFFFF" /> {/* White center square */}
    {/* Prominent 11-point Maple Leaf, centered */}
    <g transform="translate(250.05, 55.95)"> {/* Adjusts path to center in the white pale */}
      <path
        fill="#D8262C" // Red maple leaf
        d="M195.72903,160.02224c-10.98984,-0.50903 -20.5091,-4.0282 -27.77836,-10.0872 -4.94073,-4.12381 -8.99794,-9.29034 -12.00085,-15.05281 -1.1812,-2.27103 -2.20737,-4.60035 -3.06495,-7.0004 -3.00291,-8.40101 -3.8956,-17.55207 -2.6479,-26.49583 1.9622,-13.96308 9.03819,-26.46859 20.52305,-35.42484 5.06205,-3.9186 10.64548,-7.05513 16.66093,-9.36431 12.45132,-4.76406 26.57667,-5.3464 39.37868,-1.60883 11.06353,3.23838 20.77334,9.90148 27.72172,19.25686 2.26159,3.03759 4.15399,6.29304 5.65804,9.72814 0.11812,0.26468 0.23624,0.52937 0.3638,0.8035l0.17568,-0.03638c1.31242,-0.27412 2.63428,-0.52937 3.96558,-0.75645 5.35547,-0.91876 10.79587,-1.45368 16.28348,-1.64521 7.75531,-0.27412 15.39249,1.08758 22.38809,3.85254 10.40793,4.12382 18.89881,11.23621 24.22298,20.60822 3.06495,5.29371 4.94073,11.09144 5.54889,17.13309 0.67377,6.80213 -0.40094,13.62295 -2.94682,19.79387 -1.74738,4.2876 -4.18121,8.2967 -7.17609,11.8624 -3.49994,4.0765 -7.80338,7.3802 -12.68466,9.8307 -5.84485,2.9374 -12.27567,4.5003 -18.82086,4.6004 -0.25525,0 -0.50104,0 -0.75638,0l-0.03638,0.20301c-2.75073,15.09992 -11.86237,28.15534 -25.19721,36.43354 -4.85581,2.9946 -10.06204,5.24659 -15.50922,6.76575 -6.06201,1.71997 -12.33298,2.56134 -18.6293,2.56134 -10.00567,0 -19.75696,-2.27106 -28.5347,-6.40192 -10.11021,-4.71686 -18.3469,-12.09864 -23.7529,-21.46143 -3.0029,-5.2937 -4.83048,-11.04432 -5.37705,-17.04773l0.0458,-0.20301c-0.20301,0 -0.39655,0 -0.59906,0 -5.70364,0 -11.3129,-0.88238 -16.6798,-2.58863zm46.86058,22.99219c9.79334,1.18121 19.61571,0.45825 28.86852,-2.04908 9.85892,-2.66596 18.4318,-7.66877 25.01065,-14.43311 5.65802,-5.77313 9.60578,-12.96601 11.62616,-20.76288 1.49173,-5.77314 2.08545,-11.75806 1.74735,-17.70514 -0.37997,-6.40192 -1.77463,-12.72571 -4.16232,-18.54804 -3.8002,-9.24317 -10.18924,-16.94495 -18.49747,-22.22895 -7.32047,-4.6225 -15.80191,-7.18552 -24.60086,-7.31672 -10.09134,-0.13123 -19.97748,2.03009 -28.68836,6.27069 -8.65451,4.20416 -15.79248,10.57728 -20.73465,18.53858 -4.77347,7.57441 -7.43247,16.42481 -7.70816,25.58094 -0.16626,5.30317 0.71314,10.59687 2.41165,15.61097 2.53412,7.35682 6.86582,13.9267 12.55341,18.98987 7.68387,6.80213 17.27808,11.16895 27.72173,12.52582zm-96.36707,-25.55268c0.2837,-11.35431 4.04709,-22.12629 10.7002,-30.81025 4.42954,-5.80036 9.98703,-10.62446 16.27405,-14.14942 10.07315,-5.64191 21.85462,-8.03504 33.74866,-6.60199 10.38898,1.24964 20.00479,5.74585 27.47196,12.55341 0.16626,0.14069 0.32309,0.28138 0.48932,0.42206l-0.0094,-0.01881 6.82834,-7.04749c4.40131,-4.54456 9.84757,-8.10724 15.89627,-10.51166 9.99625,-3.92804 21.10242,-4.85581 31.81406,-2.71265 11.30146,2.24378 21.29465,7.90156 28.76288,16.04804 4.73584,5.13807 7.89774,11.23621 9.20694,17.81873 1.01727,5.0893 1.03613,10.29554 0.0552,15.39249 -1.21741,6.24249 -3.97501,12.09864 -7.93066,17.08411 -5.58441,6.93824 -13.40085,11.92804 -22.2836,14.26447 -6.67981,1.74738 -13.62295,2.03009 -20.32297,0.8035 -10.44431,-1.88947 -19.96799,-7.13892 -26.96964,-14.67829l-6.85562,-7.09461 -0.0282,0.0282c-6.59686,7.53797 -15.7453,12.79145 -26.00876,14.90583 -9.03819,1.83228 -18.3469,0.6832 -26.72592,-3.30402 -9.80277,-4.65888 -17.363,-12.20496 -21.28522,-21.59266 -2.48135,-5.98548 -3.59555,-12.46076 -3.29462,-18.98041z m170.40204,-10.02228c3.8956,-0.20301 7.76474,-0.87293 11.4791,-1.97834 9.75696,-2.90961 17.95194,-8.76374 23.46915,-16.59571 5.0893,-7.20221 7.6926,-15.96845 7.25821,-24.95966 -0.37054,-7.82227 -2.99405,-15.42886 -7.52194,-21.78034 -4.50974,-6.30835 -10.8049,-10.94245 -18.00919,-13.49463 -9.23373,-3.26654 -19.28507,-3.38465 -28.64118,-0.33564 -9.60578,3.16224 -17.64078,9.13575 -22.91779,17.15197 -5.61127,8.63288 -8.15009,18.85266 -7.20221,28.99976 0.75638,8.21174 3.97501,16.08442 9.04764,22.47861 4.61307,5.79093 10.81436,10.03162 17.94357,12.44904 3.14386,1.06873 6.37265,1.78565 9.62464,2.09626z m-38.00196,92.47016c6.28339,0.29297 12.51966,-0.31397 18.49747,-1.80127 11.16895,-2.79786 20.32297,-9.02875 26.08667,-17.63904 4.43897,-6.56098 6.76038,-14.33875 6.60199,-22.2836 -0.13123,-6.44904 -1.4068,-12.79145 -3.76584,-18.65235 -3.56104,-8.70575 -9.69068,-15.79248 -17.50016,-20.38843 -6.30835,-3.63392 -13.40085,-5.54889 -20.60822,-5.50171 -8.8143,0.0552 -17.43454,2.70322 -24.75547,7.3802 -7.01895,4.47205 -12.41495,10.90961 -15.50922,18.46088 -3.15332,7.72706 -4.08597,16.18873 -2.80686,24.39869 1.11758,7.16663 4.29706,13.9267 8.9885,19.45984 4.94073,5.80036 11.2551,9.83071 18.40308,11.78626 2.93738,0.8035 5.93225,1.29285 8.96027,1.46314z"
      />
    </g>
  </svg>
);


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
    viewsMenu: { en: "Views", fr: "Vues" },
  };

  const userIsAuthenticated = currentUser && currentUser.uid !== 'user-unauth';
  const isAdmin = userIsAuthenticated && currentUser.role === 'Admin';

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b bg-card shadow-sm", "print-hide")}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-12 items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-5 w-10"> {/* h-5 (20px), w-10 (40px) for 1:2 aspect ratio */}
              <CanadaFlagIcon className="h-full w-full" />
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
    

    

    
