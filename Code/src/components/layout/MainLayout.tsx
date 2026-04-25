import { ReactNode } from "react";
import { TopNav } from "./TopNav";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
