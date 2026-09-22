import { useEffect, useState } from "react";

import { isAuthDisabled } from "./authDisabled";

export interface AppAdminContextValue {
  isAdmin: boolean;
}

function readAdminFromDocument(): boolean {
  if (isAuthDisabled()) {
    return true;
  }
  if (document.documentElement.classList.contains("pps-shell-access-pending")) {
    return false;
  }
  return document.documentElement.classList.contains("pps-role-admin");
}

export function useAppAdmin(): AppAdminContextValue {
  const [isAdmin, setIsAdmin] = useState(readAdminFromDocument);

  useEffect(() => {
    const sync = () => {
      setIsAdmin(readAdminFromDocument());
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
    };
  }, []);

  return { isAdmin };
}
