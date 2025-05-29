
"use client"; // Required for context and dropdown interaction

import Link from 'next/link';
import { ShieldHalf, UserCircle, BarChart3, LogOut, Users } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // For a slightly better look

export default function Header() {
  const { currentUser, availableUsers, switchUser } = useUser();

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length > 1) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return parts[0].substring(0, 2);
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
              Government of Canada / <span className="font-normal">Gouvernement du Canada</span>
            </span>
          </div>
          <Button variant="link" size="sm" className="text-sm text-foreground hover:text-primary">
            Français
          </Button>
        </div>

        {/* Main app header content */}
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-primary">
            <ShieldHalf className="h-7 w-7" />
            <span className="font-bold">RiskNav</span>
          </Link>
          
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/" passHref>
              <Button variant="ghost" className="text-sm sm:text-base text-foreground hover:bg-accent hover:text-accent-foreground">Dashboard</Button>
            </Link>
            <Link href="/statistics" passHref>
              <Button variant="ghost" className="text-sm sm:text-base text-foreground hover:bg-accent hover:text-accent-foreground">
                <BarChart3 className="h-4 w-4 mr-0 sm:mr-2" /> 
                <span className="hidden sm:inline">Statistics</span>
              </Button>
            </Link>
            <Link href="/assessments/new" passHref>
              <Button variant="default" className="text-sm sm:text-base">New Assessment</Button>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="User Profile" className="text-foreground hover:bg-accent hover:text-accent-foreground">
                  <Avatar className="h-7 w-7 text-xs">
                    {/* Optional: Add AvatarImage if you have user images */}
                    {/* <AvatarImage src={currentUser.avatarUrl} /> */}
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {currentUser.id !== 'user-unauth' ? getInitials(currentUser.name) : <UserCircle className="h-5 w-5"/>}
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
                <DropdownMenuLabel className="text-xs font-normal">Switch User</DropdownMenuLabel>
                {availableUsers.filter(u => u.id !== 'user-unauth').map(user => (
                  <DropdownMenuItem key={user.id} onClick={() => switchUser(user.id)} disabled={currentUser.id === user.id}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>{user.name}</span>
                  </DropdownMenuItem>
                ))}
                {currentUser.id !== 'user-unauth' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => switchUser('user-unauth')}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log Out (Simulated)</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}
