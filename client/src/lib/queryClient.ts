import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMsg = res.statusText || "An error occurred";
    let errorObj: any = {
      status: res.status,
      statusText: res.statusText
    };
    
    try {
      const textResponse = await res.text();
      console.log(`Error response text: ${textResponse}`);
      
      if (textResponse) {
        try {
          // Try to parse as JSON
          const jsonData = JSON.parse(textResponse);
          errorObj.response = jsonData;
          
          if (jsonData.message) {
            errorMsg = typeof jsonData.message === 'string' 
              ? jsonData.message 
              : JSON.stringify(jsonData.message);
            errorObj.message = errorMsg;
          }
        } catch (parseError) {
          // If not valid JSON, use the text response
          console.log("Error response is not valid JSON");
          errorMsg = textResponse;
          errorObj.message = errorMsg;
          errorObj.response = textResponse;
        }
      }
    } catch (e) {
      console.error("Error parsing error response:", e);
    }
    
    // Create a more detailed error object
    const error = new Error(`${res.status}: ${errorMsg}`) as any;
    error.status = res.status;
    error.statusText = res.statusText;
    error.response = errorObj.response;
    
    console.error("API Error details:", error);
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    console.log(`API Request: ${method} ${url}`, data || '');
    
    // Make sure we have proper headers for all requests
    const headers: Record<string, string> = {
      "Accept": "application/json"
    };
    
    // Add Content-Type header if we're sending data
    if (data) {
      headers["Content-Type"] = "application/json";
    }
    
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    console.log(`API Response: ${res.status} ${res.statusText}`);
    
    // Clone the response before checking if it's ok, so we can still return it
    const resClone = res.clone();
    
    if (!res.ok) {
      // If the response is not OK, log the full response for debugging
      console.error(`API Error: ${method} ${url} responded with ${res.status}`);
      const responseText = await res.text();
      console.error("Response body:", responseText);
      
      // Create a new response with the same status and statusText
      const errorResponse = new Response(responseText, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers
      });
      
      await throwIfResNotOk(errorResponse);
    }
    
    return resClone;
  } catch (error) {
    console.error(`API Error in ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      console.log(`Query Request: GET ${queryKey[0]}`);
      
      // Make sure we have proper headers for all requests
      const headers: Record<string, string> = {
        "Accept": "application/json"
      };
      
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers
      });
      
      console.log(`Query Response: ${res.status} ${res.statusText}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      if (!res.ok) {
        // If the response is not OK, log the full response for debugging
        console.error(`Query Error: GET ${queryKey[0]} responded with ${res.status}`);
        const responseText = await res.text();
        console.error("Response body:", responseText);
        
        // Create a new response with the same status and statusText
        const errorResponse = new Response(responseText, {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers
        });
        
        await throwIfResNotOk(errorResponse);
      }
      
      return await res.json();
    } catch (error) {
      console.error(`Query Error for ${queryKey[0]}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
