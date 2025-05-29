
import Link from 'next/link';
import { ShieldHalf, UserCircle, Search, BarChart3 } from 'lucide-react'; // Added BarChart3
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; 

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 md:px-6">
        {/* Top bar mimicking Canada.ca */}
        <div className="flex h-12 items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            {/* Placeholder for Government of Canada logo and text */}
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
          
          <div className="hidden md:flex items-center gap-2 w-1/3 max-w-xs">
             {/* Placeholder for CCG Search, if desired */}
             {/* 
            <Input type="search" placeholder="Search CCG..." className="h-9 text-sm bg-input border-border focus:bg-background" />
            <Button variant="secondary" size="icon" className="h-9 w-9 shrink-0">
              <Search className="h-4 w-4" />
            </Button>
             */}
          </div>

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
            <Button variant="ghost" size="icon" aria-label="User Profile" className="hidden sm:inline-flex text-foreground hover:bg-accent hover:text-accent-foreground">
              <UserCircle className="h-6 w-6" />
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}

