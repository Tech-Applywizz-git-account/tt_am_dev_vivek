import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ currentUser, children }: any) => {
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
