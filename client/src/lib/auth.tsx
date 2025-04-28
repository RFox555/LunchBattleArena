import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { queryClient } from "./queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "./queryClient";
import { useLocation } from "wouter";

type User = {
  id: number;
  username: string;
  userType: "driver" | "rider";
  riderId?: string;
  name: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string, userType: "driver" | "rider") => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check if user is already logged in
    setIsLoading(true);
    
    fetch("/api/auth/me", {
      credentials: "include"
    })
    .then(res => {
      if (res.ok) {
        return res.json();
      }
      throw new Error("Not authenticated");
    })
    .then(data => {
      setUser(data);
    })
    .catch(() => {
      setUser(null);
    })
    .finally(() => {
      setIsLoading(false);
    });
  }, []);

  const login = async (username: string, password: string, userType: "driver" | "rider") => {
    setIsLoading(true);
    try {
      // Use fetch directly instead of apiRequest to handle 401 responses
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, userType }),
        credentials: "include"
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Invalid credentials" }));
        throw new Error(errorData.message || "Failed to login");
      }
      
      const userData = await res.json();
      setUser(userData);
      
      // Redirect to the appropriate dashboard
      const redirectPath = userType === "driver" ? "/driver" : "/rider";
      setLocation(redirectPath);
      
      toast({
        title: "Logged in successfully",
        description: `Welcome back, ${userData.name}`,
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
      queryClient.clear();
      setLocation("/login");
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
