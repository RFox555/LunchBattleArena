import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  QrCode,
  ClipboardList,
  User,
  LogOut,
  Menu,
  ChevronDown,
  Bus,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();

  const isDriver = user?.userType === "driver";
  const baseRoute = isDriver ? "/driver" : "/rider";

  const navigationItems = isDriver
    ? [
        { name: "Dashboard", href: "/driver", icon: Home },
        { name: "Check-In Rider", href: "/driver/scan", icon: QrCode },
        { name: "History", href: "/driver/history", icon: ClipboardList },
      ]
    : [
        { name: "Dashboard", href: "/rider", icon: Home },
        { name: "History", href: "/rider/history", icon: ClipboardList },
      ];

  const isActivePath = (path: string) => {
    if (path === baseRoute) {
      return location === path;
    }
    return location.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center">
            <Bus className="h-6 w-6 text-primary mr-2" />
            <span className="font-bold text-lg">Bus Tracker</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActivePath(item.href) ? "default" : "ghost"}
                  className="flex items-center"
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>

          {/* User Menu (Desktop) */}
          <div className="hidden md:flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{user?.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div>
                    <div className="font-medium">{user?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {user?.userType}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => logout()}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col h-full">
                  <div className="flex items-center py-4">
                    <Bus className="h-6 w-6 text-primary mr-2" />
                    <span className="font-bold text-lg">Bus Tracker</span>
                  </div>

                  <div className="py-4">
                    <div className="text-muted-foreground text-sm">
                      Signed in as
                    </div>
                    <div className="font-medium">{user?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {user?.userType}
                    </div>
                  </div>

                  <nav className="flex flex-col space-y-1 py-4">
                    {navigationItems.map((item) => (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={isActivePath(item.href) ? "default" : "ghost"}
                          className="justify-start w-full"
                        >
                          <item.icon className="h-4 w-4 mr-2" />
                          {item.name}
                        </Button>
                      </Link>
                    ))}
                  </nav>

                  <div className="mt-auto pb-8">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => logout()}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Bus Tracking System &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
