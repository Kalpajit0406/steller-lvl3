'use client';

import { TransactionRecord } from '@/hooks/useCampaigns';
import { ExternalLink, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface TransactionHistoryProps {
  transactions: TransactionRecord[];
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-4">
      <div>
        <h3 className="font-sans font-bold text-lg text-white">
          Session Transactions
        </h3>
        <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider mt-0.5">
          History of contract interactions in this session
        </p>
      </div>

      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted-foreground font-mono">
            No transactions executed in this session.
          </div>
        ) : (
          transactions.map((tx) => (
            <div 
              key={tx.id} 
              className="bg-zinc-950/40 border border-border/50 p-4 rounded-2xl flex flex-col gap-2 hover:border-zinc-800 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-white">{tx.type}</h4>
                  <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]" title={tx.campaignTitle}>
                    {tx.campaignTitle}
                  </p>
                </div>
                
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1.5 font-bold ${
                  tx.status === 'Success'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : tx.status === 'Failed'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-primary/10 text-primary border border-primary/20 animate-pulse'
                }`}>
                  {tx.status === 'Pending' && <RefreshCw className="h-3 w-3 animate-spin" />}
                  {tx.status === 'Success' && <CheckCircle className="h-3 w-3" />}
                  {tx.status === 'Failed' && <XCircle className="h-3 w-3" />}
                  {tx.status}
                </span>
              </div>

              {/* Tx Hash & Link */}
              {tx.txHash && (
                <div className="flex justify-between items-center border-t border-border/30 pt-2 text-[10px] font-mono">
                  <span className="text-zinc-500 truncate max-w-[150px]" title={tx.txHash}>
                    Hash: {tx.txHash}
                  </span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-0.5"
                  >
                    Explorer
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Error messages if failed */}
              {tx.error && (
                <p className="text-[10px] font-mono text-red-400 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                  {tx.error}
                </p>
              )}

              <span className="text-[9px] text-zinc-600 font-mono text-right">
                {formatTime(tx.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
