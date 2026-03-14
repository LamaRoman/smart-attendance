'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountantAttendancePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/attendance');
  }, [router]);
  return null;
}