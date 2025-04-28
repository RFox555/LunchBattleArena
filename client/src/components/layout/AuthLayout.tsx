import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth.tsx";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthRouteProps {
  children: ReactNode;
  userType?: "driver" | "rider";
}

export default function AuthRoute({ children, userType }: AuthRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to login if not authenticated
      setLocation("/login");
    } else if (!isLoading && user && userType && user.userType !== userType) {
      // Redirect to the appropriate dashboard if user type doesn't match
      const redirectPath = user.userType === "driver" ? "/driver" : "/rider";
      setLocation(redirectPath);
    }
  }, [user, isLoading, userType, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (userType && user.userType !== userType) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
