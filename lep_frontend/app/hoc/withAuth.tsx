"use client";

import { useRouter } from "next/navigation";
import { useEffect, ComponentType, FC } from "react";
import { useAuth } from "@/app/api/AuthContext";

export function withAuth<P extends object>(WrappedComponent: ComponentType<P>): FC<P> {
  const ComponentWithAuth: FC<P> = (props) => {
    const { accessToken } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!accessToken) {
        router.replace("/");
      }
    }, [accessToken, router]);

    if (!accessToken) return null;

    return <WrappedComponent {...props} />;
  };

  return ComponentWithAuth;
}
