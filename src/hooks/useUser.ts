"use client";

import { useEffect } from "react";
import { useUserStore } from "@/stores/userStore";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function useUser() {
  const { user, isLoading, setUser } = useUserStore();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    // 현재 사용자 가져오기
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // 인증 상태 변경 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  return {
    user,
    isLoading,
    isLoggedIn: !!user,
  };
}
