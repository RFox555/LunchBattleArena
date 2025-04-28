import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import QrScanner from "@/components/QrScanner";
import { QrCode, Search, CheckCircle, AlertCircle, KeyboardIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define the schemas
const searchSchema = z.object({
  riderId: z.string().length(5, {
    message: "Rider ID must be exactly 5 digits",
  }),
});

const checkInSchema = z.object({
  location: z.string().min(1, {
    message: "Location is required",
  }),
  note: z.string().optional(),
});

type CheckInFormData = z.infer<typeof checkInSchema>;

export default function DriverScan() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [riderId, setRiderId] = useState<string | null>(null);
  const [rider, setRider] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("manual");

  // Search form
  const searchForm = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      riderId: "",
    },
  });

  // Check-in form
  const checkInForm = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      location: "",
      note: "",
    },
  });

  // Handle searching for a rider
  const handleSearch = async (values: z.infer<typeof searchSchema>) => {
    const id = values.riderId.replace(/\s+/g, "");
    setRiderId(id);
    setIsLoading(true);
    
    try {
      console.log("Looking up rider with ID:", id);
      
      const response = await fetch(`/api/users/by-rider-id/${id}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Rider lookup failed with status ${response.status}:`, errorText);
        
        setRider(null);
        setSearchError("Rider not found. Please check the ID and try again.");
        
        toast({
          variant: "destructive",
          title: "Error",
          description: "Rider not found. Please check the ID and try again.",
        });
        return;
      }

      const data = await response.json();
      console.log("Rider found:", data);
      
      setRider(data);
      setSearchError(null);
      setCheckedIn(false);
    } catch (error) {
      console.error("Error looking up rider:", error);
      
      setRider(null);
      setSearchError("An error occurred while looking up the rider.");
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while looking up the rider.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle QR code scan result
  const handleQrCodeResult = (result: string) => {
    if (/^\d{5}$/.test(result)) {
      setRiderId(result);
      searchForm.setValue("riderId", result);
      handleSearch({ riderId: result });
    } else {
      toast({
        variant: "destructive",
        title: "Invalid QR Code",
        description: "The scanned QR code is not a valid rider ID. Please try again.",
      });
    }
  };

  // Handle check-in form submission
  const handleCheckIn = async (formData: CheckInFormData) => {
    if (!riderId || !rider) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No rider selected. Please search for a rider first.",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log("Checking in rider:", {
        riderId,
        location: formData.location,
        note: formData.note || "",
      });
      
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          riderId,
          location: formData.location,
          note: formData.note || "",
        }),
        credentials: "include",
      });

      console.log("Check-in response:", response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Check-in failed with status ${response.status}:`, errorText);
        
        throw new Error(`Check-in failed: ${errorText}`);
      }

      // Successfully checked in
      const data = await response.json();
      console.log("Check-in successful, received data:", data);
      
      // Update UI state
      setCheckedIn(true);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips/recent"] });
      
      toast({
        title: "Success",
        description: `Rider ${riderId} has been checked in successfully.`,
      });
    } catch (error) {
      console.error("Error checking in rider:", error);
      
      toast({
        variant: "destructive",
        title: "Check-in failed",
        description: error instanceof Error ? error.message : "An error occurred during check-in",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Check-In Rider</h1>
      <p className="text-muted-foreground">
        Scan or enter the rider's 5-digit ID to check them in.
      </p>

      <Tabs 
        defaultValue="manual" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scan" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Scan QR Code
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <KeyboardIcon className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="scan" className="space-y-4">
          <QrScanner 
            onResult={handleQrCodeResult} 
            isScanning={isScanning}
            setIsScanning={setIsScanning}
          />
        </TabsContent>
        
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Manual Rider Lookup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...searchForm}>
                <form
                  onSubmit={searchForm.handleSubmit(handleSearch)}
                  className="space-y-4"
                >
                  <FormField
                    control={searchForm.control}
                    name="riderId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rider ID</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              {...field}
                              placeholder="Enter 5-digit ID"
                              className="text-lg tracking-wider"
                              maxLength={5}
                            />
                            <Button
                              type="submit"
                              disabled={isLoading}
                            >
                              {isLoading ? "Searching..." : "Search"}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Enter the 5-digit ID provided to the rider
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {searchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{searchError}</AlertDescription>
        </Alert>
      )}

      {rider && !checkedIn && (
        <Card>
          <CardHeader>
            <CardTitle>Rider Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-primary/10 p-4 rounded-lg mb-4">
              <h3 className="font-semibold">Rider Information:</h3>
              <p className="text-sm">Name: {rider.name}</p>
              <p className="text-sm">ID: {rider.riderId}</p>
            </div>

            <Form {...checkInForm}>
              <form onSubmit={checkInForm.handleSubmit(handleCheckIn)} className="space-y-4">
                <FormField
                  control={checkInForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter current location or stop name"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the current bus location or stop
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={checkInForm.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional information"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Checking in..." : "Check-In Rider"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {checkedIn && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            Rider has been checked in successfully.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
