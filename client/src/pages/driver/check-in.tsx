import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";

export default function CheckIn() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    riderId: "",
    location: "Bus Stop",
    note: ""
  });

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsSuccess(false);
    
    try {
      // Validate rider ID (must be 5 digits)
      if (!/^\d{5}$/.test(formData.riderId)) {
        toast({
          title: "Invalid Rider ID",
          description: "Rider ID must be exactly 5 digits",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      // Make sure location is provided
      if (!formData.location.trim()) {
        toast({
          title: "Location Required",
          description: "Please provide a pickup location",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      // Submit the check-in
      console.log("Submitting check-in:", formData);
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData),
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to check in rider");
      }
      
      const trip = await response.json();
      console.log("Check-in successful:", trip);
      
      // Show success message
      toast({
        title: "Check-in Successful",
        description: `Rider ${formData.riderId} checked in at ${formData.location}`,
        variant: "default"
      });
      
      // Reset form and show success state
      setIsSuccess(true);
      setFormData({
        riderId: "",
        location: "Bus Stop",
        note: ""
      });
    } catch (error) {
      console.error("Check-in failed:", error);
      toast({
        title: "Check-in Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || user.userType !== "driver") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You must be logged in as a driver to use this feature.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Check-In Rider</CardTitle>
          <CardDescription>
            Enter the rider's 5-digit ID and pickup location to check them in.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="riderId">Rider ID</Label>
              <Input
                id="riderId"
                name="riderId"
                placeholder="Enter 5-digit code"
                value={formData.riderId}
                onChange={handleChange}
                required
                pattern="[0-9]{5}"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">Must be exactly 5 digits</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Pickup Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="Enter pickup location"
                value={formData.location}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                name="note"
                placeholder="Add any notes about this trip"
                value={formData.note}
                onChange={handleChange}
                disabled={isSubmitting}
                rows={3}
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking In...
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Check In Another Rider
                </>
              ) : (
                "Check In Rider"
              )}
            </Button>
            
            {isSuccess && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                <CheckCircle className="inline-block mr-2 h-4 w-4" />
                Rider successfully checked in!
              </div>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}