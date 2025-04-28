import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { formatRiderId } from "@/lib/utils";
import IdCard from "@/components/IdCard";
import { Clock, CheckCircle, User, CalendarCheck } from "lucide-react";

export default function RiderDashboard() {
  const { user } = useAuth();

  // Get trips for this rider
  const { data: trips, isLoading } = useQuery({
    queryKey: ["/api/trips"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rider Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <IdCard user={user} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{user?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="font-medium">{user?.username}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rider ID</p>
                <p className="font-medium tracking-wide">
                  {user?.riderId ? formatRiderId(user.riderId) : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            Recent Activity
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
            <div className="space-y-4">
              {trips.slice(0, 5).map((trip: any) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      {trip.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {trip.completed ? "Completed Trip" : "Active Trip"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {trip.location || "No location specified"}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(trip.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
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
                  <CalendarCheck className="h-5 w-5 text-primary" />
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
