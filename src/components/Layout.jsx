import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import NovaVendaModal from '@/components/NovaVendaModal';

export default function Layout() {
  const [vendaOpen, setVendaOpen] = useState(false);
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onNovaVenda={() => setVendaOpen(true)} />
        <main className="flex-1 px-4 md:px-6 py-6 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <NovaVendaModal open={vendaOpen} onOpenChange={setVendaOpen} />
    </div>
  );
}