import { formatDate } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, User, MapPin } from "lucide-react";

interface TripHistoryProps {
  trips: any[];
  isRider?: boolean;
}

export default function TripHistory({ trips, isRider = false }: TripHistoryProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Complete trip mutation
  const completeTripMutation = useMutation({
    mutationFn: async (tripId: number) => {
      const res = await apiRequest("PATCH", `/api/trips/${tripId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips/recent"] });
      toast({
        title: "Trip completed",
        description: "The trip has been marked as completed.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete the trip. Please try again.",
      });
    },
  });

  const handleCompleteTrip = (tripId: number) => {
    completeTripMutation.mutate(tripId);
  };

  if (!trips || trips.length === 0) {
    return <div className="py-8 text-center">No trips found.</div>;
  }

  return (
    <div className="space-y-4">
      {trips.map((trip) => (
        <div
          key={trip.id}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4 last:border-0 last:pb-0"
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                trip.completed
                  ? "bg-green-100 text-green-600"
                  : "bg-orange-100 text-orange-500"
              }`}
            >
              {trip.completed ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {trip.completed ? "Completed Trip" : "Active Trip"}
                </p>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  ID: {trip.id}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{trip.location || "No location specified"}</span>
                </div>
              </div>
              {trip.note && (
                <div className="text-sm text-muted-foreground mt-1 italic">
                  "{trip.note}"
                </div>
              )}
              <div className="text-sm text-muted-foreground mt-1">
                {formatDate(trip.timestamp)}
              </div>
            </div>
          </div>

          {!isRider && !trip.completed && (
            <div className="md:text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCompleteTrip(trip.id)}
                disabled={completeTripMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {completeTripMutation.isPending ? "Completing..." : "Complete Trip"}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
