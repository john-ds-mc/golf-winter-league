"use client";

import { useEffect, useState } from "react";

export function useAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((res) => setIsAdmin(res.ok))
      .finally(() => setChecked(true));
  }, []);

  return { isAdmin, checked };
}
