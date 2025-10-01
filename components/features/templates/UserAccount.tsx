import React, { useEffect, useState } from "react";
import LoginButton from "@/components/features/auth/LoginButton";
import UserDropdown from "@/components/features/auth/UserDropdown";
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

type Me = { loggedIn: boolean; user?: { id: string; did: string; primaryHandle: string | null } };

interface UserAccountProps extends UniversalCSSProps {
  className?: string;
}

export default function UserAccount(props: UserAccountProps) {
  const { cssProps, componentProps} = separateCSSProps(props);
  const { className: customClassName } = componentProps;
  const [me, setMe] = useState<Me>({ loggedIn: false });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (alive) setMe(data);
      } catch (error) {
        if (alive) setMe({ loggedIn: false });
      }
    })();
    return () => { alive = false; };
  }, []);

  const baseClasses = "flex items-center gap-3";
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const style = applyCSSProps(cssProps);

  const containerClassName = customClassName
    ? `${filteredClasses} ${customClassName}`
    : filteredClasses;

  if (!me.loggedIn) {
    return (
      <div className={containerClassName} style={style}>
        <span className="thread-label text-sm">visitor mode</span>
        <LoginButton />
      </div>
    );
  }

  return (
    <div className={containerClassName} style={style}>
      <UserDropdown />
    </div>
  );
}