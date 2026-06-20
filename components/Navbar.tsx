'use client';

import { useWallet } from '@/hooks/useWallet';
import { useCampaigns } from '@/hooks/useCampaigns';
import { Zap, Globe, RefreshCw } from 'lucide-react';

interface NavbarProps {
  wallet: ReturnType<typeof useWallet>;
  campaignsState: ReturnType<typeof useCampaigns>;
}

export function Navbar({ wallet, campaignsState }: NavbarProps) {
  const { address, walletType, balance, connect, disconnect, isLoading } = wallet;
  const { mode, toggleMode } = campaignsState;

  const truncateAddress = (addr: string) => {
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  };

  return (
    <nav className="glass-panel border-b border-border sticky top-0 z-50 px-4 py-3 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Title / Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 text-primary p-2 rounded-xl border border-primary/30 glow-orange animate-pulse">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-xl tracking-tight text-white flex items-center gap-2">
              Stellar Escrow <span className="text-primary text-glow">Fundraiser</span>
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
              Soroban Smart Escrow • Orange Belt
            </p>
          </div>
        </div>

        {/* Network & Wallet Controls */}
        <div className="flex flex-wrap items-center gap-3 justify-center">
          {/* Mode Switcher */}
          <button
            onClick={toggleMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs cursor-pointer transition-all duration-300 ${
              mode === 'sandbox'
                ? 'bg-orange-500/10 text-primary border-primary/30 hover:bg-orange-500/20'
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20'
            }`}
            title="Toggle interaction mode"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Mode: {mode === 'sandbox' ? 'Local Sandbox' : 'Stellar Testnet'}</span>
          </button>

          {/* Balance Display */}
          {address && (
            <div className="bg-muted/50 border border-border px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-mono text-white">
              <span className="text-muted-foreground">Bal:</span>
              <span className="font-bold text-primary">{balance || '0.00'} XLM</span>
              <button 
                onClick={wallet.refreshBalance} 
                className="hover:text-primary transition-colors p-0.5 rounded cursor-pointer"
                title="Refresh balance"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Wallet Connect/Disconnect */}
          {address ? (
            <div className="flex items-center gap-2">
              {/* Type Badge */}
              <span className="hidden sm:inline bg-muted border border-border text-muted-foreground px-2 py-1 rounded text-[10px] font-mono">
                {walletType === 'freighter' ? 'Freighter' : 'Playground'}
              </span>
              
              <button
                onClick={disconnect}
                className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 hover:border-destructive/30 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                Disconnect ({truncateAddress(address)})
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => connect('sandbox')}
                disabled={isLoading}
                className="bg-primary hover:bg-primary/95 text-white border border-primary/20 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isLoading ? 'Connecting...' : 'Playground Wallet'}
              </button>
              
              <button
                onClick={() => connect('freighter')}
                disabled={isLoading}
                className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 disabled:opacity-50"
              >
                Freighter Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
