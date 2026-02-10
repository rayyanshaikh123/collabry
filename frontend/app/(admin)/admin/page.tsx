'use client';

import React, { useContext } from 'react';
import AdminDashboard from '../../../views/Admin';
import { AdminRouteContext } from '../layout';

export default function AdminPage() {
  const { currentSubRoute } = useContext(AdminRouteContext);
  
  return <AdminDashboard currentSubRoute={currentSubRoute} />;
}

