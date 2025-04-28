import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMsg = res.statusText || "An error occurred";
    
    try {
      const textResponse = await res.text();
      if (textResponse) {
        try {
          // Try to parse as JSON
          const jsonData = JSON.parse(textResponse);
          if (jsonData.message) {
            errorMsg = typeof jsonData.message === 'string' 
              ? jsonData.message 
              : JSON.stringify(jsonData.message);
          }
        } catch {
          // If not valid JSON, use the text response
          errorMsg = textResponse;
        }
      }
    } catch (e) {
      console.error("Error parsing error response:", e);
    }
    
    throw new Error(`${res.status}: ${errorMsg}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    console.log(`API Request: ${method} ${url}`, data || '');
    
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    console.log(`API Response: ${res.status} ${res.statusText}`);
    
    // Clone the response before checking if it's ok, so we can still return it
    const resClone = res.clone();
    await throwIfResNotOk(res);
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
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      
      console.log(`Query Response: ${res.status} ${res.statusText}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
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
