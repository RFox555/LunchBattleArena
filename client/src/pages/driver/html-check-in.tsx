import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";

export default function HtmlCheckIn() {
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  
  // Set up the form submission handler directly with DOM
  useEffect(() => {
    const form = formRef.current;
    const resultDiv = resultRef.current;
    
    if (form && resultDiv) {
      form.onsubmit = async (event) => {
        event.preventDefault();
        
        // Show loading
        resultDiv.innerHTML = "<p>Processing...</p>";
        
        // Get form data
        const formData = new FormData(form);
        const riderId = formData.get("riderId") as string;
        const location = formData.get("location") as string;
        const note = formData.get("note") as string;
        
        try {
          // Make the API call directly
          const response = await fetch("/api/trips", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              riderId,
              location,
              note
            }),
            credentials: "include"
          });
          
          // Get the response text
          const text = await response.text();
          
          // Display the result
          if (response.ok) {
            resultDiv.innerHTML = `
              <div style="padding: 15px; background-color: #d1fae5; border: 1px solid #34d399; border-radius: 5px; margin-top: 20px;">
                <h3 style="color: #065f46; margin-top: 0;">Success!</h3>
                <p style="color: #065f46; margin-bottom: 5px;">Trip created successfully!</p>
                <pre style="background-color: #ecfdf5; padding: 10px; border-radius: 3px; overflow: auto; font-size: 12px;">${text}</pre>
              </div>
            `;
          } else {
            resultDiv.innerHTML = `
              <div style="padding: 15px; background-color: #fee2e2; border: 1px solid #f87171; border-radius: 5px; margin-top: 20px;">
                <h3 style="color: #b91c1c; margin-top: 0;">Error</h3>
                <p style="color: #b91c1c; margin-bottom: 5px;">Failed to create trip: ${response.status}</p>
                <pre style="background-color: #fef2f2; padding: 10px; border-radius: 3px; overflow: auto; font-size: 12px;">${text}</pre>
              </div>
            `;
          }
        } catch (error) {
          resultDiv.innerHTML = `
            <div style="padding: 15px; background-color: #fee2e2; border: 1px solid #f87171; border-radius: 5px; margin-top: 20px;">
              <h3 style="color: #b91c1c; margin-top: 0;">Error</h3>
              <p style="color: #b91c1c;">${error instanceof Error ? error.message : 'An error occurred'}</p>
            </div>
          `;
        }
      };
    }
  }, []);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Simple Check-In Form</h1>
        <p className="text-gray-500">This is a simplified form that uses direct DOM manipulation and fetch.</p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <form ref={formRef} className="space-y-4">
          <div>
            <label htmlFor="riderId" className="block text-sm font-medium text-gray-700">Rider ID</label>
            <input
              type="text"
              id="riderId"
              name="riderId"
              defaultValue="12345"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              defaultValue="Downtown Station"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700">Note (Optional)</label>
            <textarea
              id="note"
              name="note"
              defaultValue="Simple check-in test"
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <button
              type="submit"
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Trip
            </button>
          </div>
        </form>
        
        <div ref={resultRef} className="mt-4"></div>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
        <h3 className="text-yellow-800 font-medium">Note:</h3>
        <p className="text-yellow-700 text-sm">
          This form avoids React's state management completely. It uses direct DOM manipulation 
          and the fetch API to submit the form data to the server.
        </p>
      </div>
    </div>
  );
}