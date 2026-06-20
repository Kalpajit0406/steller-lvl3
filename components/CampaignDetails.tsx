'use client';

import { useState } from 'react';
import { Campaign, useCampaigns } from '@/hooks/useCampaigns';
import { useWallet } from '@/hooks/useWallet';
import { 
  User, AlertCircle, ArrowUpRight, CheckCircle, 
  ExternalLink, Calendar, Info, RefreshCcw, ShieldAlert 
} from 'lucide-react';

interface CampaignDetailsProps {
  campaign: Campaign;
  wallet: ReturnType<typeof useWallet>;
  campaignsState: ReturnType<typeof useCampaigns>;
}

export function CampaignDetails({ campaign, wallet, campaignsState }: CampaignDetailsProps) {
  const { address } = wallet;
  const { pledge, releaseFunds, claimRefund, currentTxStatus, resetCurrentTx } = campaignsState;
  const [pledgeAmount, setPledgeAmount] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);

  const percent = Math.min(100, Math.floor((campaign.raised / campaign.goal) * 100));
  const userContribution = address ? (campaign.contributions[address] || 0) : 0;
  
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = campaign.deadline - now;
  const isExpired = timeLeft <= 0;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    resetCurrentTx();

    const amt = parseFloat(pledgeAmount);
    if (isNaN(amt) || amt <= 0) {
      setActionError('Pledge amount must be a positive number.');
      return;
    }

    try {
      await pledge(campaign.id, amt);
      setPledgeAmount('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Pledge failed.');
    }
  };

  const handleRelease = async () => {
    setActionError(null);
    resetCurrentTx();
    try {
      await releaseFunds(campaign.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Escrow release failed.');
    }
  };

  const handleRefund = async () => {
    setActionError(null);
    resetCurrentTx();
    try {
      await claimRefund(campaign.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Refund claim failed.');
    }
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl space-y-6">
      {/* Title Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
            campaign.state === 'Released'
              ? 'bg-orange-500/10 text-primary border border-primary/20'
              : campaign.state === 'Successful'
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : campaign.state === 'Failed'
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          }`}>
            {campaign.state}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground truncate">
            Escrow Address: {campaign.id}
          </span>
        </div>
        <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-white">
          {campaign.title}
        </h2>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400">About the Project</h4>
        <p className="text-zinc-300 text-sm leading-relaxed">
          {campaign.description}
        </p>
      </div>

      {/* Milestones notes if available */}
      {campaign.milestoneNotes && (
        <div className="bg-zinc-950/60 border border-border p-4 rounded-xl space-y-2">
          <h4 className="text-xs font-mono uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            Milestone Release Path
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
            {campaign.milestoneNotes}
          </p>
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-950/40 p-4 rounded-2xl border border-border/40 font-mono">
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase">Goal</span>
          <p className="text-lg font-bold text-white">{campaign.goal} XLM</p>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase">Raised</span>
          <p className="text-lg font-bold text-primary">{campaign.raised} XLM</p>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase">Progress</span>
          <p className="text-lg font-bold text-green-400">{percent}%</p>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase">Remaining</span>
          <p className="text-lg font-bold text-white">
            {Math.max(0, campaign.goal - campaign.raised)} XLM
          </p>
        </div>
      </div>

      {/* Reforestation / Telemetry details */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between border-y border-border/50 py-4 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <div>
            <p className="text-[10px] text-zinc-500">DEADLINE DATE</p>
            <p className="text-zinc-300">{formatDate(campaign.deadline)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <div>
            <p className="text-[10px] text-zinc-500">CAMPAIGN CREATOR</p>
            <p className="text-zinc-300 truncate max-w-[150px]" title={campaign.creator}>
              {campaign.creator.slice(0, 6)}...{campaign.creator.slice(-6)}
            </p>
          </div>
        </div>
      </div>

      {/* Action Area */}
      <div className="space-y-4">
        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Escrow Interaction</h4>

        {!address ? (
          <div className="bg-orange-500/5 border border-primary/20 p-5 rounded-2xl text-center space-y-3">
            <ShieldAlert className="h-8 w-8 text-primary mx-auto" />
            <p className="text-sm text-zinc-300">
              Please connect your Stellar wallet (Freighter or Playground) to interact with this campaign.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* User Contribution status */}
            {userContribution > 0 && (
              <div className="bg-green-500/10 border border-green-500/20 p-3.5 rounded-xl flex items-center justify-between text-xs font-mono">
                <span className="text-green-400 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" />
                  Your contribution
                </span>
                <span className="font-bold text-white">{userContribution} XLM</span>
              </div>
            )}

            {/* Campaign Expired status check */}
            {campaign.state === 'Active' && isExpired && (
              <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-center gap-2.5 text-xs text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>This campaign has expired. Waiting for status refresh or event sync.</span>
              </div>
            )}

            {/* Action buttons based on status */}
            {campaign.state === 'Active' && !isExpired && (
              <form onSubmit={handlePledgeSubmit} className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="Amount in XLM"
                    value={pledgeAmount}
                    onChange={(e) => setPledgeAmount(e.target.value)}
                    className="w-full bg-zinc-950 border border-border hover:border-zinc-700 focus:border-primary text-white text-sm rounded-xl px-4 py-3 outline-none font-mono transition-colors"
                    required
                  />
                  <span className="absolute right-4 top-3 text-xs font-mono text-muted-foreground uppercase">XLM</span>
                </div>
                <button
                  type="submit"
                  disabled={currentTxStatus.status === 'Pending'}
                  className="bg-primary hover:bg-primary/95 text-white font-medium text-sm px-6 py-3 rounded-xl cursor-pointer transition-colors shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 font-mono"
                >
                  Pledge Funds
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {campaign.state === 'Successful' && (
              <div className="bg-green-500/5 border border-green-500/20 p-5 rounded-2xl space-y-4">
                <p className="text-xs text-green-400 font-mono flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Success! The goal of {campaign.goal} XLM has been reached.
                </p>
                {address === campaign.creator ? (
                  <button
                    onClick={handleRelease}
                    disabled={currentTxStatus.status === 'Pending'}
                    className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-xl cursor-pointer transition-colors shadow-lg shadow-orange-500/10 font-mono text-sm disabled:opacity-50"
                  >
                    Release Funds to My Wallet
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground font-mono">
                    Waiting for the project creator ({campaign.creator.slice(0, 8)}...) to claim/release the escrowed funds.
                  </p>
                )}
              </div>
            )}

            {campaign.state === 'Failed' && (
              <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-2xl space-y-4">
                <p className="text-xs text-red-400 font-mono flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Campaign failed to reach its goal of {campaign.goal} XLM by the deadline.
                </p>
                {userContribution > 0 ? (
                  <button
                    onClick={handleRefund}
                    disabled={currentTxStatus.status === 'Pending'}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl cursor-pointer transition-colors font-mono text-sm disabled:opacity-50"
                  >
                    Claim My Refund ({userContribution} XLM)
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground font-mono">
                    Only users who pledged to this campaign are eligible for escrow refunds.
                  </p>
                )}
              </div>
            )}

            {campaign.state === 'Released' && (
              <div className="bg-zinc-950/60 border border-border p-5 rounded-2xl text-center space-y-2">
                <p className="text-xs text-primary font-mono font-bold uppercase tracking-wider">
                  Escrow Completed
                </p>
                <p className="text-xs text-muted-foreground">
                  The raised funds ({campaign.raised} XLM) have been successfully released to the creator.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline Error Displays */}
      {(actionError || currentTxStatus.error) && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-2 text-xs text-red-400 font-mono">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Transaction Failed</p>
            <p className="opacity-90">{actionError || currentTxStatus.error}</p>
          </div>
        </div>
      )}

      {/* Transaction Feedback Panel */}
      {currentTxStatus.status !== 'Idle' && (
        <div className="bg-zinc-950/80 border border-border p-5 rounded-2xl space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Transaction Action:</span>
            <span className="text-white font-bold">{currentTxStatus.type}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status:</span>
            <span className={`font-bold flex items-center gap-1.5 ${
              currentTxStatus.status === 'Success'
                ? 'text-green-400'
                : currentTxStatus.status === 'Failed'
                ? 'text-red-400'
                : 'text-primary animate-pulse'
            }`}>
              {currentTxStatus.status === 'Pending' && <RefreshCcw className="h-3 w-3 animate-spin" />}
              {currentTxStatus.status}
            </span>
          </div>

          {currentTxStatus.txHash && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Transaction Hash:</span>
                <span className="text-zinc-300 text-[10px] break-all">{currentTxStatus.txHash}</span>
              </div>
              <div className="pt-2 text-right">
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${currentTxStatus.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                >
                  View in Stellar Expert Explorer
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
