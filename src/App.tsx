import { createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import AppRoutes from './routes';
import queryClient from './components/containers/query-client';
import { ThemeProvider } from './components/containers/theme-provider';
import { Toaster } from './components/ui/sonner';

const router = createBrowserRouter(createRoutesFromElements(AppRoutes));

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
