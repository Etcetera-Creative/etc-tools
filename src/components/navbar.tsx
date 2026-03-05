"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, CircleUser, Code2, KeyRound, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function Navbar() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user);
      setIsAdmin(user?.email === "jamie@etcetera.cr");
    });
  }, [supabase]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target as Node)) {
        setToolsDropdownOpen(false);
      }
    }

    if (dropdownOpen || toolsDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen, toolsDropdownOpen]);

  // Don't show navbar on login page; show on landing only if logged in
  if (pathname === "/login") return null;
  if (pathname === "/" && !loggedIn) return null;

  const showBlog = pathname.startsWith("/blog");

  const tools = [
    {
      label: "Scheduler",
      href: "/scheduler",
      active:
        pathname.startsWith("/scheduler") || pathname.startsWith("/dashboard") || pathname.startsWith("/plan"),
    },
    {
      label: "URL Shortener",
      href: "/shortener",
      active: pathname.startsWith("/shortener"),
    },
    ...(isAdmin
      ? [
          {
            label: "Admin",
            href: "/admin",
            active: pathname.startsWith("/admin"),
          },
        ]
      : []),
  ];

  const activeToolLabel = tools.find((tool) => tool.active)?.label ?? "Tools";

  return (
    <nav className="border-b bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link href="/" className="font-semibold text-lg shrink-0">
            Etc Tools
          </Link>
          <Link
            href="/blog"
            className={`text-sm transition-colors hover:text-foreground ${
              showBlog ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Blog
          </Link>
          {loggedIn && (
            <div className="relative" ref={toolsDropdownRef}>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-sm"
                onClick={() => {
                  setToolsDropdownOpen((open) => !open);
                  setDropdownOpen(false);
                }}
              >
                {activeToolLabel}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
              {toolsDropdownOpen && (
                <div className="absolute left-0 mt-2 w-44 bg-background border rounded-md shadow-lg z-50">
                  {tools.map((tool) => (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      onClick={() => setToolsDropdownOpen(false)}
                      className={`block px-4 py-2 text-sm transition-colors hover:bg-accent ${
                        tool.active ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {tool.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loggedIn ? (
            <div className="relative" ref={profileDropdownRef}>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setDropdownOpen((open) => !open);
                  setToolsDropdownOpen(false);
                }}
              >
                <CircleUser className="h-5 w-5" />
              </Button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-background border rounded-md shadow-lg z-50">
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </button>
                  <a
                    href="/developers"
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <Code2 className="h-4 w-4" />
                    Developers
                  </a>
                  <a
                    href="/reset-password"
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <KeyRound className="h-4 w-4" />
                    Change Password
                  </a>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = "/";
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
