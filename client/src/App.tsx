import { Switch, Route, useLocation, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth.tsx";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import DriverDashboard from "@/pages/driver/dashboard";
import DriverScan from "@/pages/driver/scan";
import DriverHistory from "@/pages/driver/history";
import TestCheckIn from "@/pages/driver/test-check-in";
import RiderDashboard from "@/pages/rider/dashboard";
import RiderHistory from "@/pages/rider/history";
import AuthRoute from "@/components/layout/AuthLayout";
import AppLayout from "@/components/layout/AppLayout";

function AppRoutes() {
  const [location] = useLocation();
  
  return (
    <Switch location={location}>
      {/* Public Routes */}
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Protected Driver Routes */}
      <Route path="/driver">
        {() => (
          <AuthRoute userType="driver">
            <AppLayout>
              <Switch>
                <Route path="/driver" component={DriverDashboard} />
                <Route path="/driver/scan" component={DriverScan} />
                <Route path="/driver/history" component={DriverHistory} />
                <Route path="/driver/test-check-in" component={TestCheckIn} />
                <Route component={NotFound} />
              </Switch>
            </AppLayout>
          </AuthRoute>
        )}
      </Route>
      
      {/* Protected Rider Routes */}
      <Route path="/rider">
        {() => (
          <AuthRoute userType="rider">
            <AppLayout>
              <Switch>
                <Route path="/rider" component={RiderDashboard} />
                <Route path="/rider/history" component={RiderHistory} />
                <Route component={NotFound} />
              </Switch>
            </AppLayout>
          </AuthRoute>
        )}
      </Route>
      
      {/* Fallback 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
