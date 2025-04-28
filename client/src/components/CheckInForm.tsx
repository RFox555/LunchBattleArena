import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const checkInSchema = z.object({
  location: z.string().min(1, {
    message: "Location is required",
  }),
  note: z.string().optional(),
});

type CheckInFormData = z.infer<typeof checkInSchema>;

interface CheckInFormProps {
  onSubmit: (data: CheckInFormData) => void;
  isPending: boolean;
}

export default function CheckInForm({ onSubmit, isPending }: CheckInFormProps) {
  const form = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      location: "",
      note: "",
    },
  });

  const handleSubmit = (data: CheckInFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter current location or stop name"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter the current bus location or stop
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any additional information"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Checking in..." : "Check-In Rider"}
        </Button>
      </form>
    </Form>
  );
}
