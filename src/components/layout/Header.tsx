import Link from 'next/link';
import { ShieldHalf, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-primary">
          <ShieldHalf className="h-7 w-7" />
          <span className="font-bold">RiskNav</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href="/" passHref>
            <Button variant="ghost" className="text-sm sm:text-base">Dashboard</Button>
          </Link>
          <Link href="/assessments/new" passHref>
            <Button variant="default" className="text-sm sm:text-base">New Assessment</Button>
          </Link>
          {/* TODO: User Authentication - Profile/Login/Logout Button */}
          <Button variant="ghost" size="icon" aria-label="User Profile" className="hidden sm:inline-flex">
            <UserCircle className="h-6 w-6" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
