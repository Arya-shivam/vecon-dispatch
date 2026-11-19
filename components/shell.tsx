"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { today, masterKinds } from "@/lib/domain";
import type { Role } from "@/lib/roles";

export function Shell({
  children,
  demo,
  role,
  guest = false,
  email,
}: {
  children: React.ReactNode;
  demo: boolean;
  role: Role;
  guest?: boolean;
  email?: string;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    document.documentElement.classList.toggle("drawer-open", open);
    return () => document.documentElement.classList.remove("drawer-open");
  }, [open]);
  const links =
    role === "admin"
      ? [
          ["Daily jobs", "/d/" + today()],
          ["Add job", "/d/" + today() + "/new"],
          ["All jobs", "/jobs"],
          ...masterKinds.map((k) => [k[0].toUpperCase() + k.slice(1), "/" + k]),
          ["Reports", "/reports"],
          ["Settings", "/settings"],
        ]
      : [
          ["Daily jobs", "/d/" + today()],
          ["Reports", "/reports"],
          ["Settings", "/settings"],
          ...(guest ? [["Admin sign in", "/login"]] : []),
        ];
  return (
    <>
      <header className="topbar">
        <Link href={"/d/" + today()} className="brand" aria-label="VECON Construction">
          <Image
            src="/vecon-logo.jpg"
            alt="VECON Construction"
            width={280}
            height={48}
            className="brand-logo"
            priority
          />
        </Link>
        <button
          className="icon-button"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
        >
          <Menu size={23} />
        </button>
      </header>
      {demo && (
        <div className="demo-banner">
          Demo workspace · sample data · saved on this machine
        </div>
      )}
      {role === "viewer" && (
        <div className="demo-banner">
          {guest
            ? "Public view · no login needed · sign in only to manage jobs"
            : "View only · trip updates are disabled"}
          {email ? ` · ${email}` : ""}
        </div>
      )}
      {open && (
        <div className="drawer-backdrop" onClick={() => setOpen(false)}>
          <nav
            className="drawer"
            aria-label="Main navigation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row">
              <Image
                src="/vecon-logo.jpg"
                alt="VECON Construction"
                width={240}
                height={42}
                className="brand-logo"
              />
              <button
                className="icon-button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </div>
            {links.map(([name, href]) => (
              <Link
                key={href}
                href={href}
                className={path === href ? "active" : ""}
              >
                {name}
                <ArrowUpRight size={15} />
              </Link>
            ))}
          </nav>
        </div>
      )}
      <main>{children}</main>
      <footer>
        VECON <span>Daily dispatch, kept in order.</span>
      </footer>
    </>
  );
}
