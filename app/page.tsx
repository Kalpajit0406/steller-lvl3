'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useCampaigns } from '@/hooks/useCampaigns';
import { Navbar } from '@/components/Navbar';
import { CampaignCard } from '@/components/CampaignCard';
import { CampaignDetails } from '@/components/CampaignDetails';
import { CreateCampaignForm } from '@/components/CreateCampaignForm';
import { ActivityFeed } from '@/components/ActivityFeed';
import { TransactionHistory } from '@/components/TransactionHistory';
import { 
  Compass, PlusCircle, History, Flame, ShieldCheck 
} from 'lucide-react';

export default function Home() {
  const wallet = useWallet();
  const campaignsState = useCampaigns(wallet);
  
  const { campaigns, events, transactions } = campaignsState;
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'logs'>('browse');

  // Select first campaign by default if not set
  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0];

  // Compute overall stats
  const totalRaised = campaigns.reduce((acc, c) => acc + c.raised, 0);
  const activeCount = campaigns.filter(c => c.state === 'Active').length;
  const successCount = campaigns.filter(c => c.state === 'Successful' || c.state === 'Released').length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <Navbar wallet={wallet} campaignsState={campaignsState} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:px-8 md:py-8 space-y-6">
        
        {/* Banner Overview */}
        <section className="glass-panel p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                <Flame className="h-4 w-4" />
                Crowdfunding escrow protocol
              </span>
              <h2 className="font-sans font-black text-2xl md:text-3xl text-white">
                Decentralized Milestone Escrow
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Empower creators to launch campaigns and accept contributions. Funds are secured inside automated smart escrows and released to creators only when milestone conditions are met, ensuring full contributor protection.
              </p>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 shrink-0 font-mono">
              <div className="bg-zinc-950/50 border border-border p-3 rounded-2xl text-center space-y-1 min-w-[90px] md:min-w-[110px]">
                <span className="text-[9px] text-zinc-500 uppercase">Deployed</span>
                <p className="text-base md:text-lg font-bold text-white">{campaigns.length}</p>
              </div>
              <div className="bg-zinc-950/50 border border-border p-3 rounded-2xl text-center space-y-1 min-w-[90px] md:min-w-[110px]">
                <span className="text-[9px] text-zinc-500 uppercase">Total Raised</span>
                <p className="text-base md:text-lg font-bold text-primary">{totalRaised} XLM</p>
              </div>
              <div className="bg-zinc-950/50 border border-border p-3 rounded-2xl text-center space-y-1 min-w-[90px] md:min-w-[110px]">
                <span className="text-[9px] text-zinc-500 uppercase">Funded</span>
                <p className="text-base md:text-lg font-bold text-green-400">{successCount}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Controls */}
        <div className="flex border-b border-border/80 pb-px gap-2 scrollbar-none overflow-x-auto">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-2 px-4 py-2.5 font-sans font-bold text-sm tracking-tight border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'browse'
                ? 'border-primary text-white'
                : 'border-transparent text-muted-foreground hover:text-zinc-300'
            }`}
          >
            <Compass className="h-4 w-4" />
            Browse Campaigns
          </button>
          
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2.5 font-sans font-bold text-sm tracking-tight border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'create'
                ? 'border-primary text-white'
                : 'border-transparent text-muted-foreground hover:text-zinc-300'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Deploy Campaign
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 font-sans font-bold text-sm tracking-tight border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-primary text-white'
                : 'border-transparent text-muted-foreground hover:text-zinc-300'
            }`}
          >
            <History className="h-4 w-4" />
            Activity & Logs
          </button>
        </div>

        {/* Tab content renders */}
        <section className="space-y-6">
          {activeTab === 'browse' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Campaign Cards List (Left Column) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Campaign Registry</h3>
                  <span className="text-[10px] text-zinc-500 font-mono">{activeCount} active escrows</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 max-h-[750px] overflow-y-auto pr-1">
                  {campaigns.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground glass-panel rounded-2xl font-mono">
                      No campaigns found.
                    </div>
                  ) : (
                    campaigns.map((c) => (
                      <CampaignCard
                        key={c.id}
                        campaign={c}
                        isSelected={selectedCampaignId === c.id}
                        onSelect={() => setSelectedCampaignId(c.id)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Campaign Details View (Right Column) */}
              <div className="lg:col-span-7">
                <div className="flex justify-between items-center mb-4 px-1">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Campaign Escrow Inspector</h3>
                </div>
                {selectedCampaign ? (
                  <CampaignDetails
                    campaign={selectedCampaign}
                    wallet={wallet}
                    campaignsState={campaignsState}
                  />
                ) : (
                  <div className="glass-panel p-8 text-center text-muted-foreground rounded-3xl font-mono text-sm">
                    Select a campaign from the registry to inspect its escrow contract.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="max-w-2xl mx-auto">
              <CreateCampaignForm
                wallet={wallet}
                campaignsState={campaignsState}
                onSuccess={(newId) => {
                  setSelectedCampaignId(newId);
                  setActiveTab('browse');
                }}
              />
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Event Feed */}
              <ActivityFeed events={events} />
              
              {/* Transaction history */}
              <TransactionHistory transactions={transactions} />
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/80 py-6 mt-12 bg-zinc-950/40 text-center text-xs text-muted-foreground font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 Stellar Escrow Fundraiser. Built for Stellar Orange Belt Submission.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              Soroban Smart Verified
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
