import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';

export const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-16 lg:ml-64 transition-all duration-300">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
