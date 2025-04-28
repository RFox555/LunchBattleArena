import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, QrCode, ClipboardList, Clock, User } from "lucide-react";

export default function DriverDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch recent trips data
  const { data: trips, isLoading: isLoadingTrips } = useQuery({
    queryKey: ["/api/trips/recent"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch total rider count
  const { data: riders, isLoading: isLoadingRiders } = useQuery({
    queryKey: ["/api/users?userType=rider"],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Driver Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}</p>
        </div>
        <Link href="/driver/scan">
          <Button className="flex items-center gap-2">
            <QrCode size={16} />
            Check-In Rider
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Check-ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTrips ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {trips?.filter((trip: any) => {
                  const tripDate = new Date(trip.timestamp);
                  const today = new Date();
                  return (
                    tripDate.getDate() === today.getDate() &&
                    tripDate.getMonth() === today.getMonth() &&
                    tripDate.getFullYear() === today.getFullYear()
                  );
                }).length || 0}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Riders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRiders ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold">{riders?.length || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Trips
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTrips ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {trips?.filter((trip: any) => trip.driverId === user?.id)
                  .length || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recent" className="w-full">
        <TabsList>
          <TabsTrigger value="recent">Recent Check-ins</TabsTrigger>
          <TabsTrigger value="your">Your Check-ins</TabsTrigger>
        </TabsList>
        <TabsContent value="recent" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Check-ins</CardTitle>
              <CardDescription>
                View the latest rider check-ins across all drivers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTrips ? (
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
              ) : trips?.length > 0 ? (
                <div className="space-y-4">
                  {trips?.slice(0, 10).map((trip: any) => (
                    <div
                      key={trip.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Rider ID: {trip.riderId}</p>
                          <p className="text-sm text-muted-foreground">
                            {trip.location || "No location specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {trip.completed ? (
                          <span className="flex items-center text-sm text-green-600">
                            <CheckCircle size={16} className="mr-1" />
                            Completed
                          </span>
                        ) : (
                          <span className="flex items-center text-sm text-orange-500">
                            <Clock size={16} className="mr-1" />
                            In Progress
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {formatDate(trip.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p>No check-ins yet today.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="your" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Check-ins</CardTitle>
              <CardDescription>
                Check-ins recorded by you
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTrips ? (
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
              ) : (
                <div className="space-y-4">
                  {trips
                    ?.filter((trip: any) => trip.driverId === user?.id)
                    .slice(0, 10)
                    .map((trip: any) => (
                      <div
                        key={trip.id}
                        className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              Rider ID: {trip.riderId}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {trip.location || "No location specified"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {trip.completed ? (
                            <span className="flex items-center text-sm text-green-600">
                              <CheckCircle size={16} className="mr-1" />
                              Completed
                            </span>
                          ) : (
                            <span className="flex items-center text-sm text-orange-500">
                              <Clock size={16} className="mr-1" />
                              In Progress
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {formatDate(trip.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              {trips?.filter((trip: any) => trip.driverId === user?.id)
                .length === 0 && (
                <div className="py-8 text-center">
                  <p>You haven't checked in any riders yet.</p>
                  <Link href="/driver/scan">
                    <Button className="mt-4">Check-In a Rider</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for drivers</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link href="/driver/scan">
              <Button variant="outline" className="w-full justify-start">
                <QrCode className="mr-2 h-4 w-4" />
                Check-In Rider
              </Button>
            </Link>
            <Link href="/driver/history">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardList className="mr-2 h-4 w-4" />
                View Trip History
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
