import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import CheckInForm from "@/components/CheckInForm";
import { QrCode, Search, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const searchSchema = z.object({
  riderId: z.string().length(5, {
    message: "Rider ID must be exactly 5 digits",
  }),
});

export default function DriverScan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [riderId, setRiderId] = useState<string | null>(null);
  const [rider, setRider] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);

  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      riderId: "",
    },
  });

  // Rider lookup mutation
  const lookupMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("GET", `/api/users/by-rider-id/${id}`);
      return res.json();
    },
    onSuccess: (data) => {
      setRider(data);
      setSearchError(null);
      setCheckedIn(false);
    },
    onError: (error: any) => {
      setRider(null);
      setSearchError("Rider not found. Please check the ID and try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Rider not found. Please check the ID and try again.",
      });
    },
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (data: { riderId: string; location: string; note: string }) => {
      const res = await apiRequest("POST", "/api/trips", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips/recent"] });
      setCheckedIn(true);
      toast({
        title: "Check-in successful",
        description: `Rider ${riderId} has been checked in successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Check-in failed",
        description: "There was an error checking in the rider. Please try again.",
      });
    },
  });

  const onSearch = (values: z.infer<typeof searchSchema>) => {
    const id = values.riderId.replace(/\s+/g, ""); // Remove any spaces
    setRiderId(id);
    lookupMutation.mutate(id);
  };

  const handleCheckIn = (data: { location: string; note: string }) => {
    if (!riderId) return;
    
    checkInMutation.mutate({
      riderId,
      location: data.location,
      note: data.note,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If user presses Enter, submit the form
    if (e.key === "Enter" && form.formState.isValid) {
      form.handleSubmit(onSearch)();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Check-In Rider</h1>
      <p className="text-muted-foreground">
        Enter the rider's 5-digit ID to check them in.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Look Up Rider
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSearch)}
              className="space-y-4"
              onKeyDown={handleKeyDown}
            >
              <FormField
                control={form.control}
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
                          disabled={lookupMutation.isPending || !form.formState.isValid}
                        >
                          {lookupMutation.isPending ? "Searching..." : "Search"}
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

          {searchError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{searchError}</AlertDescription>
            </Alert>
          )}

          {rider && !checkedIn && (
            <div className="mt-6">
              <div className="bg-primary/10 p-4 rounded-lg mb-4">
                <h3 className="font-semibold">Rider Found:</h3>
                <p className="text-sm">Name: {rider.name}</p>
                <p className="text-sm">ID: {rider.riderId}</p>
              </div>

              <CheckInForm onSubmit={handleCheckIn} isPending={checkInMutation.isPending} />
            </div>
          )}

          {checkedIn && (
            <Alert className="mt-6 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">
                Rider has been checked in successfully.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
