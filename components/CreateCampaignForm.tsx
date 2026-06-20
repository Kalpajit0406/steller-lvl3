'use client';

import { useState } from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useWallet } from '@/hooks/useWallet';
import { PlusCircle, Info, ShieldAlert, Sparkles } from 'lucide-react';

interface CreateCampaignFormProps {
  campaignsState: ReturnType<typeof useCampaigns>;
  wallet: ReturnType<typeof useWallet>;
  onSuccess: (newCampaignId: string) => void;
}

export function CreateCampaignForm({ campaignsState, wallet, onSuccess }: CreateCampaignFormProps) {
  const { createCampaign, currentTxStatus } = campaignsState;
  const { address } = wallet;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('7'); // Default 7 days
  const [milestones, setMilestones] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const goalVal = parseFloat(goal);
    if (isNaN(goalVal) || goalVal <= 0) {
      setError('Goal amount must be a positive number.');
      return;
    }

    const deadlineVal = parseInt(deadline);
    if (isNaN(deadlineVal) || deadlineVal <= 0) {
      setError('Deadline must be at least 1 day.');
      return;
    }

    try {
      const tx = await createCampaign(title, description, goalVal, deadlineVal, milestones);
      if (tx && tx.campaignId) {
        setTitle('');
        setDescription('');
        setGoal('');
        setDeadline('7');
        setMilestones('');
        onSuccess(tx.campaignId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy campaign.');
    }
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl space-y-6">
      <div>
        <h2 className="font-sans font-extrabold text-2xl text-white flex items-center gap-2">
          <PlusCircle className="h-6 w-6 text-primary" />
          Deploy New Campaign Escrow
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Deploy an independent Soroban smart contract to manage contributions, milestones, and release conditions automatically.
        </p>
      </div>

      {!address ? (
        <div className="bg-orange-500/5 border border-primary/20 p-5 rounded-2xl text-center space-y-3">
          <ShieldAlert className="h-8 w-8 text-primary mx-auto" />
          <p className="text-sm text-zinc-300">
            Please connect your wallet (Freighter or Sandbox) to authorize and sign the Soroban contract deployment.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <label htmlFor="title" className="text-xs font-mono uppercase tracking-wider text-zinc-400">Campaign Name</label>
            <input
              id="title"
              type="text"
              placeholder="e.g. Clean Energy microgrids"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-border hover:border-zinc-700 focus:border-primary text-white text-sm rounded-xl px-4 py-3 outline-none font-sans transition-colors"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="description" className="text-xs font-mono uppercase tracking-wider text-zinc-400">Description</label>
            <textarea
              id="description"
              placeholder="Provide a detailed overview of the campaign goal, why the funds are needed, and how they will be deployed."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-zinc-950 border border-border hover:border-zinc-700 focus:border-primary text-white text-sm rounded-xl px-4 py-3 outline-none font-sans transition-colors resize-none"
              required
            />
          </div>

          {/* Goal & Deadline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="goal" className="text-xs font-mono uppercase tracking-wider text-zinc-400">Funding Goal (XLM)</label>
              <div className="relative">
                <input
                  id="goal"
                  type="number"
                  step="any"
                  min="1"
                  placeholder="e.g. 5000"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full bg-zinc-950 border border-border hover:border-zinc-700 focus:border-primary text-white text-sm rounded-xl px-4 py-3 outline-none font-mono transition-colors"
                  required
                />
                <span className="absolute right-4 top-3 text-xs font-mono text-muted-foreground uppercase">XLM</span>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="deadline" className="text-xs font-mono uppercase tracking-wider text-zinc-400">Deadline (Days)</label>
              <div className="relative">
                <input
                  id="deadline"
                  type="number"
                  min="1"
                  placeholder="e.g. 14"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-zinc-950 border border-border hover:border-zinc-700 focus:border-primary text-white text-sm rounded-xl px-4 py-3 outline-none font-mono transition-colors"
                  required
                />
                <span className="absolute right-4 top-3 text-xs font-mono text-muted-foreground uppercase">Days</span>
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Milestone Notes</label>
              <span className="text-[10px] text-zinc-500 font-mono">Optional</span>
            </div>
            <textarea
              placeholder="Define project milestones (e.g. Milestone 1: 50% raised -> R&D phase; Milestone 2: 100% raised -> Deployment)."
              value={milestones}
              onChange={(e) => setMilestones(e.target.value)}
              rows={3}
              className="w-full bg-zinc-950 border border-border hover:border-zinc-700 focus:border-primary text-white text-sm rounded-xl px-4 py-3 outline-none font-sans transition-colors resize-none"
            />
          </div>

          {/* Info Card */}
          <div className="bg-zinc-950/60 border border-border p-4 rounded-xl flex gap-3 text-xs text-muted-foreground">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Upon submission, the Campaign Factory contract will receive a authorization call and deploy a new Escrow contract. The parameters (goal, deadline, creator, token) will be locked at deployment.
            </p>
          </div>

          {error && (
            <p className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={currentTxStatus.status === 'Pending'}
            className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-xl cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 font-mono text-sm"
          >
            <Sparkles className="h-4 w-4" />
            {currentTxStatus.status === 'Pending' ? 'Deploying Escrow...' : 'Deploy Smart Escrow'}
          </button>
        </form>
      )}
    </div>
  );
}
