"use client";

import { useEffect } from "react";
import { setupAuthApiBridge, useAuthStore } from "../stores/authStore";

export default function AuthInitializer() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    setupAuthApiBridge();
    initAuth();
  }, [initAuth]);

  return null;
}
