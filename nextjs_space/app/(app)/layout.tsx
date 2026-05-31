import { SidebarNav } from '@/components/sidebar-nav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <main className="md:ml-60 transition-all duration-300">
        <div className="max-w-[1200px] mx-auto p-4 md:p-6 pt-14 md:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
