import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import TripHistory from "@/components/TripHistory";
import { Calendar, Clock, CheckCircle } from "lucide-react";

export default function RiderHistory() {
  const { user } = useAuth();

  // Get trips for this rider
  const { data: trips, isLoading } = useQuery({
    queryKey: ["/api/trips"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trip History</h1>
        <p className="text-muted-foreground">View your bus trip history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Your Trip History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : trips && trips.length > 0 ? (
            <TripHistory trips={trips} isRider={true} />
          ) : (
            <div className="py-8 text-center">
              <p>No trip history found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trip Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">Total Trips</span>
                </div>
                <p className="text-2xl font-bold">{trips?.length || 0}</p>
              </div>
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="font-medium">In Progress</span>
                </div>
                <p className="text-2xl font-bold">
                  {trips?.filter((trip: any) => !trip.completed).length || 0}
                </p>
              </div>
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">Completed</span>
                </div>
                <p className="text-2xl font-bold">
                  {trips?.filter((trip: any) => trip.completed).length || 0}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
