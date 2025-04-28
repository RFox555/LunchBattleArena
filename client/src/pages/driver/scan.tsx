import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import QrScanner from "@/components/QrScanner";
import { QrCode, Search, CheckCircle, AlertCircle, KeyboardIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DriverScan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [riderId, setRiderId] = useState("");
  const [rider, setRider] = useState<any | null>(null);
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [successDetails, setSuccessDetails] = useState<any | null>(null);

  // Simple function to look up a rider
  const handleSearch = async () => {
    if (!riderId || riderId.length !== 5) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid 5-digit rider ID",
      });
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    
    try {
      console.log("Looking up rider with ID:", riderId);
      
      const response = await fetch(`/api/users/by-rider-id/${riderId}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
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
      handleSearchWithId(result);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid QR Code",
        description: "The scanned QR code is not a valid rider ID. Please try again.",
      });
    }
  };

  // Search with a specific ID (used after QR scan)
  const handleSearchWithId = async (id: string) => {
    setRiderId(id);
    setIsLoading(true);
    setSearchError(null);
    
    try {
      console.log("Looking up rider with ID:", id);
      
      const response = await fetch(`/api/users/by-rider-id/${id}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
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

  // Handle check-in with direct API call
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!riderId || !rider) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No rider selected. Please search for a rider first.",
      });
      return;
    }

    if (!location) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a location.",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Use trips API directly instead of check-in
      console.log("Creating trip for rider:", {
        riderId,
        location,
        note,
      });
      
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          riderId,
          location,
          note: note || "",
        }),
        credentials: "include",
      });

      const responseText = await response.text();
      console.log(`Trip creation response (${response.status}):`, responseText);

      if (!response.ok) {
        throw new Error(`Failed to check in: ${responseText}`);
      }

      // Successfully checked in
      try {
        const data = JSON.parse(responseText);
        setSuccessDetails(data);
        console.log("Check-in successful, trip created:", data);
      } catch (e) {
        console.log("Response wasn't JSON but trip was created");
      }
      
      // Update UI state
      setCheckedIn(true);
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
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="riderId">Rider ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="riderId"
                      value={riderId}
                      onChange={(e) => setRiderId(e.target.value)}
                      placeholder="Enter 5-digit ID"
                      className="text-lg tracking-wider"
                      maxLength={5}
                    />
                    <Button 
                      onClick={handleSearch}
                      disabled={isLoading}
                    >
                      {isLoading ? "Searching..." : "Search"}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter the 5-digit ID provided to the rider
                  </p>
                </div>
              </div>
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

            <form onSubmit={handleCheckIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter current location or stop name"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Enter the current bus location or stop
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note (Optional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add any additional information"
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Checking in..." : "Check-In Rider"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {checkedIn && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            {successDetails ? (
              <div>
                <p>Rider has been checked in successfully.</p>
                <p className="mt-2 font-medium">Trip Details:</p>
                <p>Trip ID: {successDetails.id}</p>
                <p>Location: {successDetails.location}</p>
                <p>Time: {new Date(successDetails.timestamp).toLocaleString()}</p>
              </div>
            ) : (
              "Rider has been checked in successfully."
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
