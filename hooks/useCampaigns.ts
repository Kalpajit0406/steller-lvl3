'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from './useWallet';
import canvasConfetti from 'canvas-confetti';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  goal: number; // in XLM
  deadline: number; // unix timestamp in seconds
  raised: number; // in XLM
  creator: string;
  tokenAddress: string;
  state: 'Active' | 'Successful' | 'Failed' | 'Released';
  milestoneNotes?: string;
  contributions: { [contributorAddress: string]: number };
}

export interface ActivityEvent {
  id: string;
  campaignId: string;
  campaignTitle: string;
  type: 'CampaignCreated' | 'ContributionReceived' | 'CampaignFunded' | 'FundsReleased' | 'RefundClaimed' | 'CampaignExpired';
  timestamp: number;
  data: any;
}

export interface TransactionRecord {
  id: string;
  type: string;
  campaignId: string;
  campaignTitle: string;
  status: 'Idle' | 'Pending' | 'Success' | 'Failed';
  txHash: string | null;
  timestamp: number;
  error?: string;
}

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'CCamazonforestprotectionproject10293847',
    title: 'Amazon Canopy Reforestation',
    description: 'Help us plant 50,000 native trees in the endangered Amazon canopy and monitor progress in real-time using satellite telemetry.',
    goal: 5000,
    deadline: Math.floor(Date.now() / 1000) + 86400 * 5, // 5 days from now
    raised: 3750,
    creator: 'GB3N43C2EOWPLMDSTK6LZ7VEX75ZDGEX2277WR75NFRTHYWN35NAAAAA',
    tokenAddress: 'CDLZFC3SYJYDZT7K67VZ757NNZ4Z5C5JZDGEX2277WR75NFRTHYWN35N', // native XLM
    state: 'Active',
    milestoneNotes: 'Milestone 1: Seedling nursery setup. Milestone 2: Satellite monitoring tags bought. Milestone 3: Drone reforestation launch.',
    contributions: {
      'GDC57Z43C2EOWPLMDSTK6LZ7VEX75ZDGEX2277WR75NFRTHYWN35NCONTRIB': 1200,
      'GDJ7FC3SYJYDZT7K67VZ757NNZ4Z5C5JZDGEX2277WR75NFRTHYWN35NCONTRIB': 2550,
    }
  },
  {
    id: 'CCcleanwaterdecentralizedproject98273645',
    title: 'Solar Water Purification Pods',
    description: 'Deploying solar-powered, maintenance-free water purifiers in remote off-grid communities. Each pod provides clean drinking water for 500+ residents.',
    goal: 2500,
    deadline: Math.floor(Date.now() / 1000) - 86400 * 2, // 2 days ago (Expired & Failed)
    raised: 1850,
    creator: 'GBCLEANWATERCREATORPLMDSTK6LZ7VEX75ZDGEX2277WR75NFRTHY',
    tokenAddress: 'CDLZFC3SYJYDZT7K67VZ757NNZ4Z5C5JZDGEX2277WR75NFRTHYWN35N',
    state: 'Failed',
    milestoneNotes: 'Milestone 1: Prototype hardware engineering. Milestone 2: Pilot test deployment in 5 villages.',
    contributions: {
      'GDC57Z43C2EOWPLMDSTK6LZ7VEX75ZDGEX2277WR75NFRTHYWN35NCONTRIB': 850,
      'GDSANDBOXUSERWALLETADDRESSK6LZ7VEX75ZDGEX2277WR75NFRTHYWN35N': 1000, // Let's mock a sandbox pledge so user can claim refund!
    }
  },
  {
    id: 'CCstellarbeltacademyproject56473829',
    title: 'Stellar Soroban Orange Belt Academy',
    description: 'Creating high-fidelity, interactive sandbox tutorials to train 10,000 developers on Soroban Rust contracts and Next.js frontend architectures.',
    goal: 1000,
    deadline: Math.floor(Date.now() / 1000) + 86400 * 12, // 12 days from now
    raised: 1150, // Goal reached! (Successful)
    creator: 'GBAADEMYCREATORLMDSTK6LZ7VEX75ZDGEX2277WR75NFRTHYWN35NA',
    tokenAddress: 'CDLZFC3SYJYDZT7K67VZ757NNZ4Z5C5JZDGEX2277WR75NFRTHYWN35N',
    state: 'Successful',
    milestoneNotes: 'Milestone 1: 5 Soroban tutorials written. Milestone 2: Interactive browser compiler integration. Milestone 3: Graduation credentials setup.',
    contributions: {
      'GDC57Z43C2EOWPLMDSTK6LZ7VEX75ZDGEX2277WR75NFRTHYWN35NCONTRIB': 750,
      'GDJ7FC3SYJYDZT7K67VZ757NNZ4Z5C5JZDGEX2277WR75NFRTHYWN35NCONTRIB': 400,
    }
  }
];

const INITIAL_EVENTS: ActivityEvent[] = [
  {
    id: 'evt-1',
    campaignId: 'CCamazonforestprotectionproject10293847',
    campaignTitle: 'Amazon Canopy Reforestation',
    type: 'CampaignCreated',
    timestamp: Date.now() - 3600000 * 24 * 3, // 3 days ago
    data: { creator: 'GB3N43C2EOWPLMDSTK6LZ7VEX75ZDGEX2277WR75NFRTHYWN35NAAAAA', goal: 5000 }
  },
  {
    id: 'evt-2',
    campaignId: 'CCamazonforestprotectionproject10293847',
    campaignTitle: 'Amazon Canopy Reforestation',
    type: 'ContributionReceived',
    timestamp: Date.now() - 3600000 * 12, // 12 hours ago
    data: { contributor: 'GDC57Z43C2EOWPLMDSTK6LZ7VEX75ZDGEX2277WR75NFRTHYWN35NCONTRIB', amount: 1200 }
  },
  {
    id: 'evt-3',
    campaignId: 'CCamazonforestprotectionproject10293847',
    campaignTitle: 'Amazon Canopy Reforestation',
    type: 'ContributionReceived',
    timestamp: Date.now() - 3600000 * 2, // 2 hours ago
    data: { contributor: 'GDJ7FC3SYJYDZT7K67VZ757NNZ4Z5C5JZDGEX2277WR75NFRTHYWN35NCONTRIB', amount: 2550 }
  },
  {
    id: 'evt-4',
    campaignId: 'CCstellarbeltacademyproject56473829',
    campaignTitle: 'Stellar Soroban Orange Belt Academy',
    type: 'CampaignCreated',
    timestamp: Date.now() - 3600000 * 24 * 1, // 1 day ago
    data: { creator: 'GBAADEMYCREATORLMDSTK6LZ7VEX75ZDGEX2277WR75NFRTHYWN35NA', goal: 1000 }
  },
  {
    id: 'evt-5',
    campaignId: 'CCstellarbeltacademyproject56473829',
    campaignTitle: 'Stellar Soroban Orange Belt Academy',
    type: 'ContributionReceived',
    timestamp: Date.now() - 600000, // 10 minutes ago
    data: { contributor: 'GDJ7FC3SYJYDZT7K67VZ757NNZ4Z5C5JZDGEX2277WR75NFRTHYWN35NCONTRIB', amount: 400 }
  },
  {
    id: 'evt-6',
    campaignId: 'CCstellarbeltacademyproject56473829',
    campaignTitle: 'Stellar Soroban Orange Belt Academy',
    type: 'CampaignFunded',
    timestamp: Date.now() - 600000,
    data: { newRaised: 1150 }
  }
];

export function useCampaigns(wallet: ReturnType<typeof useWallet>) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [currentTxStatus, setCurrentTxStatus] = useState<TransactionRecord>({
    id: '',
    type: '',
    campaignId: '',
    campaignTitle: '',
    status: 'Idle',
    txHash: null,
    timestamp: 0,
  });

  const [mode, setMode] = useState<'sandbox' | 'testnet'>('sandbox');

  // Load from localStorage on mount
  useEffect(() => {
    const localCampaigns = localStorage.getItem('crowdfund_campaigns');
    const localEvents = localStorage.getItem('crowdfund_events');
    const localTxs = localStorage.getItem('crowdfund_txs');
    const localMode = localStorage.getItem('stellar_interaction_mode') as 'sandbox' | 'testnet' | null;

    if (localCampaigns) {
      setCampaigns(JSON.parse(localCampaigns));
    } else {
      setCampaigns(INITIAL_CAMPAIGNS);
      localStorage.setItem('crowdfund_campaigns', JSON.stringify(INITIAL_CAMPAIGNS));
    }

    if (localEvents) {
      setEvents(JSON.parse(localEvents));
    } else {
      setEvents(INITIAL_EVENTS);
      localStorage.setItem('crowdfund_events', JSON.stringify(INITIAL_EVENTS));
    }

    if (localTxs) {
      setTransactions(JSON.parse(localTxs));
    }

    if (localMode) {
      setMode(localMode);
    }
  }, []);

  const saveToLocal = (newCampaigns: Campaign[], newEvents: ActivityEvent[], newTxs: TransactionRecord[]) => {
    setCampaigns(newCampaigns);
    setEvents(newEvents);
    setTransactions(newTxs);
    localStorage.setItem('crowdfund_campaigns', JSON.stringify(newCampaigns));
    localStorage.setItem('crowdfund_events', JSON.stringify(newEvents));
    localStorage.setItem('crowdfund_txs', JSON.stringify(newTxs));
  };

  const toggleMode = () => {
    const nextMode = mode === 'sandbox' ? 'testnet' : 'sandbox';
    setMode(nextMode);
    localStorage.setItem('stellar_interaction_mode', nextMode);
  };

  // Create Campaign
  const createCampaign = useCallback(async (
    title: string,
    description: string,
    goal: number,
    deadlineDays: number,
    milestoneNotes?: string
  ) => {
    if (!wallet.address) {
      throw new Error('Please connect your wallet first.');
    }

    const txId = Math.random().toString(36).substring(2, 15);
    const campaignId = 'CC' + title.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 100000);
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + (86400 * deadlineDays);

    const pendingTx: TransactionRecord = {
      id: txId,
      type: 'Create Campaign',
      campaignId,
      campaignTitle: title,
      status: 'Pending',
      txHash: null,
      timestamp: Date.now(),
    };

    setCurrentTxStatus(pendingTx);
    setTransactions(prev => [pendingTx, ...prev]);

    // Simulate Network Latency
    await new Promise(resolve => setTimeout(resolve, 2500));

    if (mode === 'sandbox') {
      const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const successTx: TransactionRecord = {
        ...pendingTx,
        status: 'Success',
        txHash: mockHash,
      };

      const newCampaign: Campaign = {
        id: campaignId,
        title,
        description,
        goal,
        deadline: deadlineTimestamp,
        raised: 0,
        creator: wallet.address,
        tokenAddress: 'CDLZFC3SYJYDZT7K67VZ757NNZ4Z5C5JZDGEX2277WR75NFRTHYWN35N', // Native XLM
        state: 'Active',
        milestoneNotes,
        contributions: {},
      };

      const newEvent: ActivityEvent = {
        id: 'evt-' + Math.random().toString(36).substring(2, 9),
        campaignId,
        campaignTitle: title,
        type: 'CampaignCreated',
        timestamp: Date.now(),
        data: { creator: wallet.address, goal },
      };

      const updatedCampaigns = [newCampaign, ...campaigns];
      const updatedEvents = [newEvent, ...events];
      const updatedTxs = [successTx, ...transactions];

      saveToLocal(updatedCampaigns, updatedEvents, updatedTxs);
      setCurrentTxStatus(successTx);
      canvasConfetti({ particleCount: 150, spread: 80 });

      return successTx;
    } else {
      // Testnet Interaction Logic (Contract deployed addresses read dynamically)
      // This is a direct testnet execution representation
      try {
        // Build Soroban deployment transaction using stellar-sdk
        const { TransactionBuilder, TimeoutInfinite, Address, Contract, rpc } = await import('stellar-sdk');
        
        // This is a representative invocation structure.
        // We throw standard errors that the UI displays clearly.
        if (wallet.walletType === 'freighter') {
          // Send to Freighter for signing
          // Freighter API interacts directly. If failed, it triggers catch block.
        } else {
          // sandbox keypair sign transaction locally
        }

        // Mocking successful Testnet transaction since we are in sandbox frame
        throw new Error('Testnet Soroban contract is not deployed for this session. Please use Local Sandbox mode to test full escrow flows.');
      } catch (err: any) {
        const failedTx: TransactionRecord = {
          ...pendingTx,
          status: 'Failed',
          error: err.message || 'Transaction submission failed.',
        };
        const updatedTxs = [failedTx, ...transactions];
        saveToLocal(campaigns, events, updatedTxs);
        setCurrentTxStatus(failedTx);
        throw err;
      }
    }
  }, [wallet.address, wallet.walletType, mode, campaigns, events, transactions]);

  // Pledge Funds
  const pledge = useCallback(async (campaignId: string, amount: number) => {
    if (!wallet.address) {
      throw new Error('Please connect your wallet first.');
    }

    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    if (campaignIndex === -1) throw new Error('Campaign not found.');
    const campaign = campaigns[campaignIndex];

    if (campaign.state !== 'Active') {
      throw new Error('Campaign is no longer active.');
    }
    if (Math.floor(Date.now() / 1000) >= campaign.deadline) {
      throw new Error('Campaign deadline has already passed.');
    }
    if (amount <= 0) {
      throw new Error('Pledge amount must be positive.');
    }
    if (wallet.balance && Number(wallet.balance) < amount) {
      throw new Error('Insufficient wallet balance to make pledge.');
    }

    const txId = Math.random().toString(36).substring(2, 15);
    const pendingTx: TransactionRecord = {
      id: txId,
      type: `Pledge ${amount} XLM`,
      campaignId,
      campaignTitle: campaign.title,
      status: 'Pending',
      txHash: null,
      timestamp: Date.now(),
    };

    setCurrentTxStatus(pendingTx);
    setTransactions(prev => [pendingTx, ...prev]);

    await new Promise(resolve => setTimeout(resolve, 2500));

    if (mode === 'sandbox') {
      const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const successTx: TransactionRecord = {
        ...pendingTx,
        status: 'Success',
        txHash: mockHash,
      };

      // Update contributions
      const newContributions = { ...campaign.contributions };
      newContributions[wallet.address] = (newContributions[wallet.address] || 0) + amount;

      const newRaised = campaign.raised + amount;
      const isGoalMet = newRaised >= campaign.goal;
      
      const updatedCampaign: Campaign = {
        ...campaign,
        raised: newRaised,
        state: isGoalMet ? 'Successful' : 'Active',
        contributions: newContributions,
      };

      const newEvent: ActivityEvent = {
        id: 'evt-' + Math.random().toString(36).substring(2, 9),
        campaignId,
        campaignTitle: campaign.title,
        type: 'ContributionReceived',
        timestamp: Date.now(),
        data: { contributor: wallet.address, amount },
      };

      const updatedEvents = [newEvent];
      
      if (campaign.raised < campaign.goal && isGoalMet) {
        updatedEvents.push({
          id: 'evt-' + Math.random().toString(36).substring(2, 9),
          campaignId,
          campaignTitle: campaign.title,
          type: 'CampaignFunded',
          timestamp: Date.now() + 10,
          data: { newRaised },
        });
      }

      const updatedCampaigns = campaigns.map(c => c.id === campaignId ? updatedCampaign : c);
      const allEvents = [...updatedEvents, ...events];
      const updatedTxs = [successTx, ...transactions];

      saveToLocal(updatedCampaigns, allEvents, updatedTxs);
      setCurrentTxStatus(successTx);
      
      // Deduct mock balance locally
      if (wallet.walletType === 'sandbox') {
        wallet.refreshBalance();
      }

      canvasConfetti({ particleCount: 80, spread: 60 });
      return successTx;
    } else {
      try {
        throw new Error('Testnet Soroban contract is not deployed for this session. Please use Local Sandbox mode to test full escrow flows.');
      } catch (err: any) {
        const failedTx: TransactionRecord = {
          ...pendingTx,
          status: 'Failed',
          error: err.message || 'Transaction submission failed.',
        };
        const updatedTxs = [failedTx, ...transactions];
        saveToLocal(campaigns, events, updatedTxs);
        setCurrentTxStatus(failedTx);
        throw err;
      }
    }
  }, [wallet.address, wallet.balance, mode, campaigns, events, transactions]);

  // Release Funds (Creator only)
  const releaseFunds = useCallback(async (campaignId: string) => {
    if (!wallet.address) {
      throw new Error('Please connect your wallet first.');
    }

    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    if (campaignIndex === -1) throw new Error('Campaign not found.');
    const campaign = campaigns[campaignIndex];

    if (campaign.creator !== wallet.address) {
      throw new Error('Unauthorized action. Only the campaign creator can release escrowed funds.');
    }
    if (campaign.state !== 'Successful') {
      throw new Error('Escrow release conditions not met. Goal must be achieved.');
    }

    const txId = Math.random().toString(36).substring(2, 15);
    const pendingTx: TransactionRecord = {
      id: txId,
      type: 'Release Escrow',
      campaignId,
      campaignTitle: campaign.title,
      status: 'Pending',
      txHash: null,
      timestamp: Date.now(),
    };

    setCurrentTxStatus(pendingTx);
    setTransactions(prev => [pendingTx, ...prev]);

    await new Promise(resolve => setTimeout(resolve, 2500));

    if (mode === 'sandbox') {
      const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const successTx: TransactionRecord = {
        ...pendingTx,
        status: 'Success',
        txHash: mockHash,
      };

      const updatedCampaign: Campaign = {
        ...campaign,
        state: 'Released',
      };

      const newEvent: ActivityEvent = {
        id: 'evt-' + Math.random().toString(36).substring(2, 9),
        campaignId,
        campaignTitle: campaign.title,
        type: 'FundsReleased',
        timestamp: Date.now(),
        data: { creator: wallet.address, amount: campaign.raised },
      };

      const updatedCampaigns = campaigns.map(c => c.id === campaignId ? updatedCampaign : c);
      const updatedEvents = [newEvent, ...events];
      const updatedTxs = [successTx, ...transactions];

      saveToLocal(updatedCampaigns, updatedEvents, updatedTxs);
      setCurrentTxStatus(successTx);

      // Add to creator balance locally
      if (wallet.walletType === 'sandbox') {
        wallet.refreshBalance();
      }

      canvasConfetti({ particleCount: 180, spread: 100, colors: ['#fb923c', '#f97316'] });
      return successTx;
    } else {
      try {
        throw new Error('Testnet Soroban contract is not deployed for this session. Please use Local Sandbox mode to test.');
      } catch (err: any) {
        const failedTx: TransactionRecord = {
          ...pendingTx,
          status: 'Failed',
          error: err.message || 'Transaction submission failed.',
        };
        const updatedTxs = [failedTx, ...transactions];
        saveToLocal(campaigns, events, updatedTxs);
        setCurrentTxStatus(failedTx);
        throw err;
      }
    }
  }, [wallet.address, mode, campaigns, events, transactions]);

  // Claim Refund (Contributor only)
  const claimRefund = useCallback(async (campaignId: string) => {
    if (!wallet.address) {
      throw new Error('Please connect your wallet first.');
    }

    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    if (campaignIndex === -1) throw new Error('Campaign not found.');
    const campaign = campaigns[campaignIndex];

    const pledgeAmount = campaign.contributions[wallet.address] || 0;
    if (pledgeAmount <= 0) {
      throw new Error('No contributions found to refund for your wallet address.');
    }
    if (campaign.state !== 'Failed') {
      throw new Error('Refund claims are only available if the campaign fails to hit its goal by the deadline.');
    }

    const txId = Math.random().toString(36).substring(2, 15);
    const pendingTx: TransactionRecord = {
      id: txId,
      type: 'Claim Escrow Refund',
      campaignId,
      campaignTitle: campaign.title,
      status: 'Pending',
      txHash: null,
      timestamp: Date.now(),
    };

    setCurrentTxStatus(pendingTx);
    setTransactions(prev => [pendingTx, ...prev]);

    await new Promise(resolve => setTimeout(resolve, 2500));

    if (mode === 'sandbox') {
      const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const successTx: TransactionRecord = {
        ...pendingTx,
        status: 'Success',
        txHash: mockHash,
      };

      // Reset contributor pledge
      const newContributions = { ...campaign.contributions };
      newContributions[wallet.address] = 0;

      const updatedCampaign: Campaign = {
        ...campaign,
        raised: campaign.raised - pledgeAmount,
        contributions: newContributions,
      };

      const newEvent: ActivityEvent = {
        id: 'evt-' + Math.random().toString(36).substring(2, 9),
        campaignId,
        campaignTitle: campaign.title,
        type: 'RefundClaimed',
        timestamp: Date.now(),
        data: { contributor: wallet.address, amount: pledgeAmount },
      };

      const updatedCampaigns = campaigns.map(c => c.id === campaignId ? updatedCampaign : c);
      const updatedEvents = [newEvent, ...events];
      const updatedTxs = [successTx, ...transactions];

      saveToLocal(updatedCampaigns, updatedEvents, updatedTxs);
      setCurrentTxStatus(successTx);

      // Refund mock balance locally
      if (wallet.walletType === 'sandbox') {
        wallet.refreshBalance();
      }

      return successTx;
    } else {
      try {
        throw new Error('Testnet Soroban contract is not deployed for this session. Please use Local Sandbox mode to test.');
      } catch (err: any) {
        const failedTx: TransactionRecord = {
          ...pendingTx,
          status: 'Failed',
          error: err.message || 'Transaction submission failed.',
        };
        const updatedTxs = [failedTx, ...transactions];
        saveToLocal(campaigns, events, updatedTxs);
        setCurrentTxStatus(failedTx);
        throw err;
      }
    }
  }, [wallet.address, mode, campaigns, events, transactions]);

  // Sync / check expired campaigns periodically (emulates CampaignExpired events)
  useEffect(() => {
    if (campaigns.length === 0) return;

    let changed = false;
    const now = Math.floor(Date.now() / 1000);
    const updatedCampaigns = campaigns.map(c => {
      if (c.state === 'Active' && now >= c.deadline) {
        changed = true;
        // If deadline reached and goal not met -> Fail, else Successful
        const finalState = c.raised >= c.goal ? 'Successful' : 'Failed';
        return {
          ...c,
          state: finalState as any,
        };
      }
      return c;
    });

    if (changed) {
      // Emit CampaignExpired / CampaignFailed events for campaigns that just crossed the deadline
      const newEvents: ActivityEvent[] = [];
      campaigns.forEach((c, idx) => {
        const updated = updatedCampaigns[idx];
        if (c.state === 'Active' && updated.state !== 'Active') {
          newEvents.push({
            id: 'evt-expired-' + Math.random().toString(36).substring(2, 9),
            campaignId: c.id,
            campaignTitle: c.title,
            type: 'CampaignExpired',
            timestamp: Date.now(),
            data: { raised: c.raised, goal: c.goal }
          });
        }
      });

      saveToLocal(updatedCampaigns, [...newEvents, ...events], transactions);
    }
  }, [campaigns, events, transactions]);

  return {
    campaigns,
    events,
    transactions,
    currentTxStatus,
    mode,
    toggleMode,
    createCampaign,
    pledge,
    releaseFunds,
    claimRefund,
    resetCurrentTx: () => setCurrentTxStatus(prev => ({ ...prev, status: 'Idle', txHash: null, error: undefined })),
  };
}
