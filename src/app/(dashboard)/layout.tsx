"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from "@/components/MainLayout";
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is a Supplier
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!supplier) {
        // If not a supplier, check if driver (to redirect to their app)
        const { data: driver } = await supabase
          .from('drivers')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (driver) {
          router.push('/driver-app');
        } else {
          router.push('/login');
        }
        return;
      }

      setIsAuthorized(true);
    }

    checkAuth();
  }, [router]);

  if (isAuthorized === null) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return <MainLayout>{children}</MainLayout>;
}
