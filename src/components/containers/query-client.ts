import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError(error) {
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 3600000,
      throwOnError(error) {
        if (error instanceof Error) {
          toast.error('Query error: ' + error.message);
        }
        return false;
      },
    },
  },
});

export default queryClient;
