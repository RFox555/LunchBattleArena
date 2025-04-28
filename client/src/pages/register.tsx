import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Bus, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const registerSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  name: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  riderId: z.string().length(5, {
    message: "Rider ID must be exactly 5 digits.",
  }).regex(/^\d{5}$/, {
    message: "Rider ID must contain only numbers.",
  }).optional(),
});

type FormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [activeTab, setActiveTab] = useState<"driver" | "rider">("rider");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<FormData>({
    resolver: zodResolver(
      activeTab === "rider"
        ? registerSchema
        : registerSchema.omit({ riderId: true })
    ),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      riderId: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare the user data
      const userData = {
        username: data.username,
        password: data.password,
        name: data.name,
        userType: activeTab,
        ...(activeTab === "rider" && data.riderId ? { riderId: data.riderId } : {}),
      };

      // Send registration request
      const res = await apiRequest("POST", "/api/users", userData);
      const responseData = await res.json();

      setSuccess("Registration successful! You can now log in.");
      toast({
        title: "Registration successful!",
        description: "You can now log in with your credentials.",
      });

      // Reset form
      form.reset();

      // Redirect to login after 2 seconds
      setTimeout(() => {
        setLocation("/login");
      }, 2000);
    } catch (err: any) {
      console.error("Registration error:", err);

      // Handle specific error messages
      if (err.status === 400) {
        try {
          const errorData = await err.json();
          if (errorData.message === "Username already exists") {
            setError("This username is already taken. Please choose another one.");
          } else {
            setError(errorData.message || "Registration failed. Please check your information.");
          }
        } catch {
          setError("Registration failed. Please check your information.");
        }
      } else {
        setError("Something went wrong. Please try again later.");
      }

      toast({
        title: "Registration failed",
        description: "Please check the form and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <User className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Sign up to start using the bus tracking system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="rider"
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as "driver" | "rider");
              form.reset({
                username: form.getValues("username"),
                password: form.getValues("password"),
                name: form.getValues("name"),
                riderId: activeTab === "rider" ? form.getValues("riderId") : "",
              });
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="driver">Driver</TabsTrigger>
              <TabsTrigger value="rider">Rider</TabsTrigger>
            </TabsList>
            <TabsContent value="driver">
              <div className="text-center mb-4">
                <h3 className="font-medium">Driver Registration</h3>
                <p className="text-sm text-muted-foreground">
                  Create a driver account to track and manage riders
                </p>
              </div>
              
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <AlertTitle className="text-green-800">Success</AlertTitle>
                  <AlertDescription className="text-green-700">
                    {success}
                  </AlertDescription>
                </Alert>
              )}
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
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
                            placeholder="Create a password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Registering..." : "Register"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="rider">
              <div className="text-center mb-4">
                <h3 className="font-medium">Rider Registration</h3>
                <p className="text-sm text-muted-foreground">
                  Create a rider account to access your unique ID
                </p>
              </div>
              
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <AlertTitle className="text-green-800">Success</AlertTitle>
                  <AlertDescription className="text-green-700">
                    {success}
                  </AlertDescription>
                </Alert>
              )}
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="riderId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>5-Digit Rider ID</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your 5-digit ID"
                            maxLength={5}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Choose a unique 5-digit number as your rider ID
                        </FormDescription>
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
                            placeholder="Create a password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Registering..." : "Register"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-center">
            <p className="text-sm">Already have an account?</p>
            <Button variant="link" onClick={() => setLocation("/login")}>
              Sign in here
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}