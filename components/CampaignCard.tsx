'use client';

import { Campaign } from '@/hooks/useCampaigns';
import { Clock } from 'lucide-react';

interface CampaignCardProps {
  campaign: Campaign;
  isSelected: boolean;
  onSelect: () => void;
}

export function CampaignCard({ campaign, isSelected, onSelect }: CampaignCardProps) {
  const { title, description, goal, deadline, raised, state } = campaign;

  const percent = Math.min(100, Math.floor((raised / goal) * 100));
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = deadline - now;
  
  let timeStr = '';
  if (timeLeft <= 0) {
    timeStr = 'Expired';
  } else {
    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    if (days > 0) {
      timeStr = `${days}d ${hours}h left`;
    } else {
      timeStr = `${hours}h left`;
    }
  }

  const getStatusBadge = () => {
    switch (state) {
      case 'Active':
        return (
          <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-medium font-mono uppercase tracking-wider animate-pulse">
            Active
          </span>
        );
      case 'Successful':
        return (
          <span className="flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded text-[10px] font-medium font-mono uppercase tracking-wider">
            Goal Met
          </span>
        );
      case 'Released':
        return (
          <span className="flex items-center gap-1 bg-orange-500/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-medium font-mono uppercase tracking-wider">
            Released
          </span>
        );
      case 'Failed':
        return (
          <span className="flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-medium font-mono uppercase tracking-wider">
            Failed
          </span>
        );
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`glass-panel glass-panel-hover p-5 rounded-2xl cursor-pointer transition-all duration-300 ${
        isSelected 
          ? 'border-primary/50 shadow-[0_0_20px_-5px_rgba(249,115,22,0.2)] bg-zinc-900/80 scale-[1.01]' 
          : 'hover:bg-zinc-900/40'
      }`}
    >
      <div className="flex justify-between items-start gap-2 mb-3">
        <h3 className="font-sans font-bold text-lg text-white group-hover:text-primary transition-colors line-clamp-1">
          {title}
        </h3>
        {getStatusBadge()}
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
        {description}
      </p>

      {/* Progress Section */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-white font-bold">{percent}% Funded</span>
          <span className="text-muted-foreground">{raised} / {goal} XLM</span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              state === 'Released' 
                ? 'bg-gradient-to-r from-orange-600 to-orange-400' 
                : state === 'Successful'
                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                : state === 'Failed'
                ? 'bg-red-500'
                : 'bg-gradient-to-r from-primary to-orange-400'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Info Section */}
      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground font-mono">
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>{timeStr}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] truncate max-w-[150px]">
          <span className="text-zinc-500">By:</span>
          <span className="text-zinc-300 font-bold">{campaign.creator.slice(0, 4)}...{campaign.creator.slice(-4)}</span>
        </div>
      </div>
    </div>
  );
}
