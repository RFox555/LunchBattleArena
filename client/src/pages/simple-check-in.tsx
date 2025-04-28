import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const SimpleCheckIn = () => {
  const [riderId, setRiderId] = useState("12345");
  const [pickupLocation, setPickupLocation] = useState("Bus Stop");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [tripCreated, setTripCreated] = useState<any>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || user.userType !== "driver") {
      toast({
        title: "Access denied",
        description: "Only drivers can check in riders",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          riderId,
          location,
          note: note || undefined,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to check in rider");
      }
      
      const trip = await response.json();
      setTripCreated(trip);
      
      toast({
        title: "Check-in successful!",
        description: `Rider ${riderId} has been checked in at ${location}`,
      });
    } catch (error: any) {
      toast({
        title: "Check-in failed",
        description: error.message || "An error occurred while checking in the rider",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto py-8">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Simple Check-In</CardTitle>
          <CardDescription>Enter rider information to check them in</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="riderId">Rider ID</Label>
              <Input
                id="riderId"
                value={riderId}
                onChange={(e) => setRiderId(e.target.value)}
                placeholder="Enter 5-digit rider ID"
                maxLength={5}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Pickup Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter pickup location"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any notes about this trip"
                rows={3}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? "Processing..." : "Check In Rider"}
            </Button>
          </form>
          
          {tripCreated && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800 mb-2">Trip Created Successfully!</h3>
              <div className="text-sm text-green-700 space-y-1">
                <p><span className="font-medium">Trip ID:</span> {tripCreated.id}</p>
                <p><span className="font-medium">Rider ID:</span> {tripCreated.riderId}</p>
                <p><span className="font-medium">Location:</span> {tripCreated.location}</p>
                <p><span className="font-medium">Time:</span> {new Date(tripCreated.timestamp).toLocaleString()}</p>
                {tripCreated.note && (
                  <p><span className="font-medium">Note:</span> {tripCreated.note}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => navigate("/driver/dashboard")}>
            Back to Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate("/driver/history")}>
            View History
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SimpleCheckIn;