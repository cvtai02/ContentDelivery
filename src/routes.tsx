import { Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import AppLayout from '@/components/containers/app-layout';
import { LazyPage } from '@/components/containers/lazy-page';

const ThreadsPage = LazyPage(() => import('@/pages/threads'));

const AppRoutes: ReactNode = (
  <Route element={<AppLayout />}>
    <Route index element={<Navigate to="/threads" replace />} />
    <Route path="threads" element={<ThreadsPage />} />
  </Route>
);

export default AppRoutes;
