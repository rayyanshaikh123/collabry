'use client';

import React from 'react';
import RoleSelection from '../../../views/RoleSelection';
import { useRouter } from 'next/navigation';

export default function RoleSelectionPage() {
  const router = useRouter();

  const handleSelectRole = (role: 'student' | 'admin') => {
    // Store selected role in sessionStorage for the login page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedRole', role);
    }
    router.push('/login');
  };

  return <RoleSelection onSelectRole={handleSelectRole} />;
}

