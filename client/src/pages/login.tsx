import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bus, AlertCircle } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

type FormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [activeTab, setActiveTab] = useState<"driver" | "rider">("driver");
  const { login, isLoading } = useAuth();
  const { toast } = useToast();
  const [loginError, setLoginError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoginError(null);
    try {
      await login(data.username, data.password, activeTab);
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Invalid username or password. Please check your credentials and try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <Bus className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Bus Tracker</CardTitle>
          <CardDescription>
            Sign in to access the bus tracking system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loginError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Login Error</AlertTitle>
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}
          
          <Tabs
            defaultValue="driver"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "driver" | "rider")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="driver">Driver</TabsTrigger>
              <TabsTrigger value="rider">Rider</TabsTrigger>
            </TabsList>
            <TabsContent value="driver">
              <div className="text-center mb-4">
                <h3 className="font-medium">Driver Login</h3>
                <p className="text-sm text-muted-foreground">
                  Access the driver dashboard to track riders
                </p>
              </div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="rider">
              <div className="text-center mb-4">
                <h3 className="font-medium">Rider Login</h3>
                <p className="text-sm text-muted-foreground">
                  Access your rider account to view your ID and trips
                </p>
              </div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
          <Button variant="link" onClick={() => window.location.href = "/register"}>
            Don't have an account? Register here
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Bus Tracking System for Riders and Drivers
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
