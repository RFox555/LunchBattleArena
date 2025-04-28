import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function TestCheckIn() {
  const { user } = useAuth();
  const [riderId, setRiderId] = useState("12345"); // Pre-filled with test data
  const [location, setLocation] = useState("Downtown Bus Stop");
  const [note, setNote] = useState("Test check-in");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tripId, setTripId] = useState<number | null>(null);
  
  // Direct function to create a trip (bypasses the check-in API)
  const handleCreateTripDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setError("");
    
    if (!user || !user.id) {
      setError("You must be logged in as a driver");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Creating trip directly:", { 
        riderId, 
        location, 
        note,
        driverId: user.id
      });
      
      // Use the trips endpoint directly
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          riderId,
          location,
          note,
          // Driver ID comes from session
        }),
        credentials: "include",
      });

      const responseText = await response.text();
      console.log(`Response (${response.status}):`, responseText);
      
      if (!response.ok) {
        throw new Error(`Failed to create trip: ${response.status} - ${responseText}`);
      }

      try {
        const data = JSON.parse(responseText);
        console.log("Trip created successfully:", data);
        setMessage(`Trip created with ID: ${data.id}`);
        setTripId(data.id);
      } catch (e) {
        console.log("Response wasn't JSON but trip was created");
        setMessage("Trip created successfully!");
      }
    } catch (err) {
      console.error("Error creating trip:", err);
      setError(err instanceof Error ? err.message : "Failed to create trip");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Direct Trip Creation</h1>
          <p className="text-muted-foreground">
            Create a trip directly without using the check-in API.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Create a Trip Directly</CardTitle>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateTripDirectly} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="riderId">Rider ID</Label>
              <Input
                id="riderId"
                value={riderId}
                onChange={(e) => setRiderId(e.target.value)}
                placeholder="5-digit ID"
                required
              />
              <p className="text-sm text-muted-foreground">
                Enter the rider's 5-digit ID (e.g., 12345)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Current location"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Additional details"
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Trip..." : "Create Trip"}
            </Button>
          </form>
          
          {tripId && (
            <div className="mt-6 p-4 border border-green-300 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800">Trip Details</h3>
              <p className="text-green-700">Trip ID: {tripId}</p>
              <p className="text-green-700">Rider ID: {riderId}</p>
              <p className="text-green-700">Location: {location}</p>
              {note && <p className="text-green-700">Note: {note}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}