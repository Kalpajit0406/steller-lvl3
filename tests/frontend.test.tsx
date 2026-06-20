import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { CreateCampaignForm } from '@/components/CreateCampaignForm';
import { CampaignDetails } from '@/components/CampaignDetails';
import { Campaign } from '@/hooks/useCampaigns';

// Mocks
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

const mockCampaign: Campaign = {
  id: 'CCmockcampaign12345',
  title: 'Mock Canopy Reforestation',
  description: 'Test planting trees in the rainforest.',
  goal: 1000,
  deadline: Math.floor(Date.now() / 1000) + 86400 * 5, // 5 days from now
  raised: 400,
  creator: 'GB3N43C2EOWPLMDSTK6LZ7VEX75ZDGEX2277WR75NFRTHYWN35NAAAAA',
  tokenAddress: 'CDLZFC3SYJYDZT7K67VZ757NNZ4Z5C5JZDGEX2277WR75NFRTHYWN35N',
  state: 'Active',
  milestoneNotes: 'Test Milestone notes.',
  contributions: {
    'GDC57Z43C2EOWPLMDSTK6LZ7VEX75ZDGEX2277WR75NFRTHYWN35NCONTRIB': 400,
  }
};

describe('Frontend Components Unit Tests', () => {
  // 1. Test Navbar in Disconnected State
  test('Navbar renders correctly in disconnected state', () => {
    const mockWallet = {
      address: null,
      walletType: null,
      balance: null,
      secretKey: null,
      isLoading: false,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      refreshBalance: vi.fn(),
      fundSandbox: vi.fn(),
    };

    const mockCampaignsState = {
      campaigns: [],
      events: [],
      transactions: [],
      currentTxStatus: { id: '', type: '', campaignId: '', campaignTitle: '', status: 'Idle' as const, txHash: null, timestamp: 0 },
      mode: 'sandbox' as const,
      toggleMode: vi.fn(),
      createCampaign: vi.fn(),
      pledge: vi.fn(),
      releaseFunds: vi.fn(),
      claimRefund: vi.fn(),
      resetCurrentTx: vi.fn(),
    };

    render(<Navbar wallet={mockWallet as any} campaignsState={mockCampaignsState as any} />);
    
    expect(screen.getByText('Playground Wallet')).toBeInTheDocument();
    expect(screen.getByText('Freighter Wallet')).toBeInTheDocument();
  });

  // 2. Test Navbar in Connected State
  test('Navbar renders connected Freighter wallet correctly', () => {
    const mockWallet = {
      address: 'GDC57Z43C2EOWPLMDSTK6LZ7VEX75ZDGEX2277WR75NFRTHYWN35NCONTRIB',
      walletType: 'freighter' as const,
      balance: '120.50',
      secretKey: null,
      isLoading: false,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      refreshBalance: vi.fn(),
      fundSandbox: vi.fn(),
    };

    const mockCampaignsState = {
      campaigns: [],
      events: [],
      transactions: [],
      currentTxStatus: { id: '', type: '', campaignId: '', campaignTitle: '', status: 'Idle' as const, txHash: null, timestamp: 0 },
      mode: 'sandbox' as const,
      toggleMode: vi.fn(),
      createCampaign: vi.fn(),
      pledge: vi.fn(),
      releaseFunds: vi.fn(),
      claimRefund: vi.fn(),
      resetCurrentTx: vi.fn(),
    };

    render(<Navbar wallet={mockWallet as any} campaignsState={mockCampaignsState as any} />);

    expect(screen.getByText(/Freighter/i)).toBeInTheDocument();
    expect(screen.getByText(/120.50/)).toBeInTheDocument();
    expect(screen.getByText(/GDC57Z/i)).toBeInTheDocument();
  });

  // 3. Test CreateCampaignForm Connection Warning
  test('CreateCampaignForm shows connection warning if wallet is disconnected', () => {
    const mockWallet = { address: null } as any;
    const mockCampaignsState = { currentTxStatus: { status: 'Idle' } } as any;
    const mockSuccess = vi.fn();

    render(<CreateCampaignForm wallet={mockWallet} campaignsState={mockCampaignsState} onSuccess={mockSuccess} />);
    
    expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument();
  });

  // 4. Test CreateCampaignForm input rendering when connected
  test('CreateCampaignForm renders fields when wallet is connected', () => {
    const mockWallet = { address: 'GDC57Z43C2EOWPLMDSTK6LZ7VEX75ZDGEX2277WR75NFRTHYWN35NCONTRIB' } as any;
    const mockCampaignsState = { currentTxStatus: { status: 'Idle' } } as any;
    const mockSuccess = vi.fn();

    render(<CreateCampaignForm wallet={mockWallet} campaignsState={mockCampaignsState} onSuccess={mockSuccess} />);
    
    expect(screen.getByLabelText(/Campaign Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Funding Goal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Deadline/i)).toBeInTheDocument();
  });

  // 5. Test CampaignDetails rendering metrics
  test('CampaignDetails inspects campaign metrics correctly', () => {
    const mockWallet = { address: 'GDC57Z43C2EOWPLMDSTK6LZ7VEX75ZDGEX2277WR75NFRTHYWN35NCONTRIB' } as any;
    const mockCampaignsState = {
      currentTxStatus: { status: 'Idle' },
      resetCurrentTx: vi.fn(),
    } as any;

    render(<CampaignDetails campaign={mockCampaign} wallet={mockWallet} campaignsState={mockCampaignsState} />);

    expect(screen.getByText('Mock Canopy Reforestation')).toBeInTheDocument();
    expect(screen.getAllByText(/1000/)[0]).toBeInTheDocument(); // goal
    expect(screen.getAllByText(/400/)[0]).toBeInTheDocument(); // raised
    expect(screen.getByText('40%')).toBeInTheDocument(); // percent
  });
});
