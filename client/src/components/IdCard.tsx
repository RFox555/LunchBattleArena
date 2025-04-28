import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRiderId } from "@/lib/utils";
import { User, QrCode } from "lucide-react";

interface IdCardProps {
  user: any;
}

export default function IdCard({ user }: IdCardProps) {
  if (!user || !user.riderId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rider ID Card</CardTitle>
          <CardDescription>Your unique identifier</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p>No ID assigned</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary text-white">
        <div className="flex justify-between items-center">
          <CardTitle className="text-white">Rider ID Card</CardTitle>
          <User className="h-6 w-6" />
        </div>
        <CardDescription className="text-primary-foreground opacity-90">
          Show this to your driver
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="bg-primary/10 rounded-lg p-6 inline-block mx-auto">
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg mb-2 shadow-sm">
                <div className="flex justify-center items-center">
                  <QrCode className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-4xl font-bold tracking-wider text-center">
                {formatRiderId(user.riderId)}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your 5-digit ID
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="font-semibold text-lg">{user.name}</p>
            <p className="text-sm text-muted-foreground">Authorized Rider</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
