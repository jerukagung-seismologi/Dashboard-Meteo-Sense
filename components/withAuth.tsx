"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserProfile } from '@/hooks/useAuth';
import Loading from '@/app/loading';

const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: UserProfile['role'][]
) => {
  const AuthComponent = (props: P) => {
    const { loading, profile, isAuthorized } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !isAuthorized(allowedRoles)) {
        router.replace('/dashboard/access-denied');
      }
    }, [loading, profile, router, isAuthorized]);

    if (loading || !isAuthorized(allowedRoles)) {
      return <Loading />;
    }

    return <WrappedComponent {...props} />;
  };

  AuthComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return AuthComponent;
};

export default withAuth;
