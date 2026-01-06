// components/pagecomponents/site-footer.tsx

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-xs text-muted-foreground">
          {/* Links */}
          <Link
            href="/docs/guides"
            className="hover:text-foreground transition-colors"
          >
            Docs
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link
            href="/docs/terms"
            className="hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link
            href="/docs/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="text-muted-foreground/40">·</span>

          {/* Copyright */}
          <p>© {new Date().getFullYear()} SynthQA, LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
