"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";
import { CircleUser, Plus, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function Navbar() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user);
      setIsAdmin(user?.email === "jamie@etcetera.cr");
    });
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  // Don't show navbar on landing or login pages
  if (pathname === "/" || pathname === "/login") return null;

  return (
    <nav className="border-b bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link href="/" className="font-semibold text-lg shrink-0">
            Etc Tools
          </Link>
          {loggedIn && (
            <>
              <Link
                href="/scheduler"
                className={`text-sm ${pathname.startsWith("/scheduler") || pathname.startsWith("/dashboard") || pathname.startsWith("/plan") ? "text-foreground" : "text-muted-foreground"} hover:text-foreground transition-colors truncate`}
              >
                Scheduler
              </Link>
              <Link
                href="/shortener"
                className={`text-sm ${pathname.startsWith("/shortener") ? "text-foreground" : "text-muted-foreground"} hover:text-foreground transition-colors truncate`}
              >
                URL Shortener
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`text-sm ${pathname.startsWith("/admin") ? "text-foreground" : "text-muted-foreground"} hover:text-foreground transition-colors truncate`}
                >
                  Admin
                </Link>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loggedIn ? (
            <>
              <Link href="/dashboard/new">
                <Button size="sm" className="hidden sm:flex">
                  New Plan
                </Button>
                <Button size="sm" className="sm:hidden h-8 w-8 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </Link>
              <div className="relative" ref={dropdownRef}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <CircleUser className="h-5 w-5" />
                </Button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-background border rounded-md shadow-lg z-50">
                    <button
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      {theme === "dark" ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </button>
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
            </>
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
