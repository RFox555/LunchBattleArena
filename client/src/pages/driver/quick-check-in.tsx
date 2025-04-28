import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function QuickCheckIn() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [riderId, setRiderId] = useState("12345"); // Pre-filled with test data
  const [location, setLocation] = useState("Test Location");
  const [note, setNote] = useState("Quick check-in test");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tripDetails, setTripDetails] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess(false);
    setError("");
    
    try {
      console.log("Submitting trip with data:", {
        riderId,
        location,
        note,
      });
      
      // Use direct POST to /api/trips
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          riderId,
          location,
          note,
        }),
        credentials: "include",
      });
      
      const text = await response.text();
      console.log(`API response (${response.status}):`, text);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} - ${text}`);
      }
      
      // Parse the response
      try {
        const data = JSON.parse(text);
        setTripDetails(data);
        console.log("Trip created successfully:", data);
      } catch (e) {
        console.log("Response wasn't valid JSON but trip was created");
      }
      
      setSuccess(true);
      
      toast({
        title: "Success",
        description: "Trip created successfully",
      });
    } catch (err) {
      console.error("Error submitting trip:", err);
      setError(err instanceof Error ? err.message : "Failed to create trip");
      
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create trip",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quick Check-In</h1>
          <p className="text-muted-foreground">
            Check in a rider quickly with minimal steps
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Create Trip</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">
                {tripDetails ? (
                  <div>
                    <p>Rider has been checked in successfully.</p>
                    <p className="mt-2 font-medium">Trip Details:</p>
                    <p>Trip ID: {tripDetails.id}</p>
                    <p>Rider ID: {tripDetails.riderId}</p>
                    <p>Location: {tripDetails.location}</p>
                    <p>Time: {new Date(tripDetails.timestamp).toLocaleString()}</p>
                  </div>
                ) : (
                  "Trip created successfully."
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="riderId">Rider ID</Label>
              <Input
                id="riderId"
                value={riderId}
                onChange={(e) => setRiderId(e.target.value)}
                placeholder="Enter 5-digit rider ID"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any notes"
                rows={3}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Trip"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}