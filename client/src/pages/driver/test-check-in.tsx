import { useState } from "react";

export default function TestCheckIn() {
  const [riderId, setRiderId] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      console.log("Sending check-in data:", { riderId, location, note });
      
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          riderId,
          location,
          note,
        }),
        credentials: "include",
      });

      console.log("Raw response:", response);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Check-in error:", errorText);
        throw new Error(`Check-in failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Check-in success:", data);
      setMessage("Check-in successful! Trip created.");
      
      // Clear form
      setRiderId("");
      setLocation("");
      setNote("");
    } catch (err) {
      console.error("Check-in failed:", err);
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6 mt-10">
      <h1 className="text-2xl font-bold mb-4">Test Check-In Page</h1>
      <p className="text-gray-600 mb-4">
        This is a simple test page to check if the check-in API is working.
      </p>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">Rider ID</label>
          <input
            type="text"
            value={riderId}
            onChange={(e) => setRiderId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter 5-digit ID"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Current location"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Note (Optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Additional notes"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {isLoading ? "Processing..." : "Check In"}
        </button>
      </form>
    </div>
  );
}