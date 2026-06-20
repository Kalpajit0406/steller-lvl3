'use client';

import { ActivityEvent } from '@/hooks/useCampaigns';
import { Sparkles, Heart, CheckCircle2, DollarSign, RefreshCw, AlertOctagon } from 'lucide-react';

interface ActivityFeedProps {
  events: ActivityEvent[];
  filterCampaignId?: string;
}

export function ActivityFeed({ events, filterCampaignId }: ActivityFeedProps) {
  const filteredEvents = filterCampaignId 
    ? events.filter(e => e.campaignId === filterCampaignId)
    : events;

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getEventDetails = (event: ActivityEvent) => {
    const { type, data, campaignTitle } = event;
    const timeAgo = formatTimeAgo(event.timestamp);

    switch (type) {
      case 'CampaignCreated':
        return {
          icon: <Sparkles className="h-4 w-4 text-orange-400" />,
          title: 'Campaign Created',
          description: (
            <span>
              New escrow deployed for <strong className="text-white">{campaignTitle}</strong> with a goal of <strong className="text-white">{data.goal} XLM</strong>.
            </span>
          ),
          time: timeAgo,
        };
      case 'ContributionReceived':
        return {
          icon: <Heart className="h-4 w-4 text-red-400" />,
          title: 'Contribution Received',
          description: (
            <span>
              <span className="font-mono text-zinc-400">{data.contributor.slice(0, 4)}...{data.contributor.slice(-4)}</span> pledged <strong className="text-primary">{data.amount} XLM</strong>.
            </span>
          ),
          time: timeAgo,
        };
      case 'CampaignFunded':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-green-400 font-bold" />,
          title: 'Funding Goal Reached',
          description: (
            <span>
              Campaign <strong className="text-green-400">{campaignTitle}</strong> hit its milestone goal! Escrow is successful.
            </span>
          ),
          time: timeAgo,
        };
      case 'FundsReleased':
        return {
          icon: <DollarSign className="h-4 w-4 text-emerald-400" />,
          title: 'Escrow Released',
          description: (
            <span>
              Escrow of <strong className="text-white">{data.amount} XLM</strong> released to creator <span className="font-mono text-zinc-400">{data.creator.slice(0, 4)}...{data.creator.slice(-4)}</span>.
            </span>
          ),
          time: timeAgo,
        };
      case 'RefundClaimed':
        return {
          icon: <RefreshCw className="h-4 w-4 text-yellow-400" />,
          title: 'Refund Claimed',
          description: (
            <span>
              Contributor <span className="font-mono text-zinc-400">{data.contributor.slice(0, 4)}...{data.contributor.slice(-4)}</span> claimed a refund of <strong className="text-white">{data.amount} XLM</strong>.
            </span>
          ),
          time: timeAgo,
        };
      case 'CampaignExpired':
        return {
          icon: <AlertOctagon className="h-4 w-4 text-red-500" />,
          title: 'Campaign Expired',
          description: (
            <span>
              Campaign <strong className="text-white">{campaignTitle}</strong> expired without meeting its goal.
            </span>
          ),
          time: timeAgo,
        };
    }
  };

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-4">
      <div>
        <h3 className="font-sans font-bold text-lg text-white">
          {filterCampaignId ? 'Campaign Event Log' : 'Live Event Feed'}
        </h3>
        <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider mt-0.5">
          Real-time updates from smart contract events
        </p>
      </div>

      <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-2">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground font-mono">
            No events registered yet.
          </div>
        ) : (
          filteredEvents.map((event) => {
            const details = getEventDetails(event);
            return (
              <div 
                key={event.id} 
                className="flex items-start gap-3 bg-zinc-950/40 border border-border/50 p-3 rounded-xl hover:border-zinc-800 transition-colors"
              >
                <div className="bg-zinc-900 border border-border/50 p-2 rounded-lg shrink-0 mt-0.5 shadow-sm">
                  {details.icon}
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-bold text-white leading-none">{details.title}</span>
                    <span className="text-[9px] text-muted-foreground font-mono leading-none">{details.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal break-words">
                    {details.description}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
