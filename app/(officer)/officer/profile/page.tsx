'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy path — redirects to /profile */
export default function LegacyOfficerProfileRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/profile');
  }, [router]);
  return null;
}
