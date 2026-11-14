import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const queryClientDefaults = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
} as const;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(queryClientDefaults));
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
