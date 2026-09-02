import { Link } from "@tanstack/react-router";
import { AuthSlot } from "./auth-slot";
import { BrandLockup } from "./pepper";
import { Button } from "./ui/button";

export function SiteHeader({ manager = false }: { manager?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="rounded-md">
          <BrandLockup compact />
        </Link>
        <nav className="flex min-w-0 items-center gap-1 sm:gap-2">
          {manager ? (
            <Button asChild variant="ghost" size="sm">
              <Link to="/">Careers</Link>
            </Button>
          ) : (
            <Button asChild variant="secondary" size="sm">
              <Link to="/manager">GM</Link>
            </Button>
          )}
          <AuthSlot compact />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-xs text-subtle">
      <p>Unofficial hiring demo for Chili's Grill & Bar · Powered by Hearthline</p>
      <p className="mt-1">
        Not affiliated with Brinker International. Built to show a GM what AI screening can look like on the floor.
      </p>
    </footer>
  );
}
