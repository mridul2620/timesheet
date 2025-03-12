"use client";
import { ReactNode, useEffect, useState } from 'react';
import MainLayout from '@/src/components/Layout/sidebarLayout';
import Loader from '@/src/components/Loader/loader';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);
  if (!mounted) {
    return <Loader /> ;
  }

  return (
    <MainLayout>
      <div className="dashboard-content">
        {children}
      </div>
    </MainLayout>
  );
}