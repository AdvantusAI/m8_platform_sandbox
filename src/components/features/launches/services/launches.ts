import { LaunchDraft, AnalogProduct, SupplySignals, Scenario, ID } from '../types';

export interface LaunchService {
  createDraft(): Promise<{ id: string }>;
  getDraft(id: string): Promise<LaunchDraft>;
  saveDraft(draft: LaunchDraft): Promise<LaunchDraft>;
  simulate(draft: LaunchDraft): Promise<{ scenarios: Scenario[] }>;
  submit(id: string): Promise<{ status: 'in_review' }>;
  approve(id: string): Promise<{ status: 'approved' }>;
  publish(id: string): Promise<{ status: 'published'; forecastJobId: string }>;
  searchAnalogs(query: string): Promise<{ items: AnalogProduct[] }>;
  getSupplySignals(productId: string): Promise<SupplySignals>;
}

export class MockLaunchService implements LaunchService {
  private storage = new Map<string, LaunchDraft>();
  private nextId = 1;

  constructor() {
    // Load from localStorage
    const stored = localStorage.getItem('launch_drafts');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.storage = new Map(Object.entries(data));
      } catch (e) {
        console.warn('Failed to load stored drafts:', e);
      }
    }
  }

  private saveToStorage() {
    const data = Object.fromEntries(this.storage);
    localStorage.setItem('launch_drafts', JSON.stringify(data));
  }

  async createDraft(): Promise<{ id: string }> {
    const id = `draft_${this.nextId++}`;
    const draft: LaunchDraft = {
      id,
      status: 'draft',
      basics: {
        name: '',
        category: '',
        brand: '',
        uom: 'EA',
        lifecycle: 'launch',
        launchDate: '',
        locations: [],
        channels: [],
      },
      analogs: [],
      market: {
        price: 0,
        currency: 'MXN',
        distribution: { weeks: [] },
      },
      cannibalization: { impactedSkus: [] },
      scenarios: [],
      audit: {
        createdBy: 'user_1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    
    this.storage.set(id, draft);
    this.saveToStorage();
    return { id };
  }

  async getDraft(id: string): Promise<LaunchDraft> {
    const draft = this.storage.get(id);
    if (!draft) {
      throw new Error(`Draft ${id} not found`);
    }
    return { ...draft };
  }

  async saveDraft(draft: LaunchDraft): Promise<LaunchDraft> {
    const updated = {
      ...draft,
      audit: {
        ...draft.audit,
        updatedAt: new Date().toISOString(),
      },
    };
    this.storage.set(draft.id, updated);
    this.saveToStorage();
    return updated;
  }

  async simulate(draft: LaunchDraft): Promise<{ scenarios: Scenario[] }> {
    // Mock simulation - generate forecast data
    const scenarios: Scenario[] = [
      {
        id: 'base',
        name: 'Base Case',
        assumptions: {},
        forecast: this.generateMockForecast(1000),
        kpis: {
          totalUnits: 52000,
          revenue: 754000,
          grossMargin: 301600,
          peakWeek: '2025-12-15',
          avgWOS: 2.1,
        },
      },
      {
        id: 'optimistic',
        name: 'Optimistic',
        assumptions: { marketingGRPs: 150 },
        forecast: this.generateMockForecast(1300),
        kpis: {
          totalUnits: 67600,
          revenue: 980200,
          grossMargin: 392080,
          peakWeek: '2025-12-15',
          avgWOS: 1.8,
        },
      },
      {
        id: 'pessimistic',
        name: 'Pessimistic',
        assumptions: { marketingGRPs: 50 },
        forecast: this.generateMockForecast(700),
        kpis: {
          totalUnits: 36400,
          revenue: 527800,
          grossMargin: 211120,
          peakWeek: '2025-12-08',
          avgWOS: 2.8,
        },
      },
    ];

    return { scenarios };
  }

  private generateMockForecast(baseVolume: number) {
    const forecast = [];
    const startDate = new Date('2025-11-01');
    
    for (let week = 0; week < 26; week++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + week * 7);
      
      // Simulate ramp-up and seasonality
      const rampFactor = Math.min(1, week / 8); // 8-week ramp
      const seasonality = 1 + 0.3 * Math.sin((week / 26) * 2 * Math.PI); // Seasonal curve
      const noise = 0.9 + Math.random() * 0.2; // ±10% noise
      
      const value = Math.round(baseVolume * rampFactor * seasonality * noise);
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        value,
      });
    }
    
    return forecast;
  }

  async submit(id: string): Promise<{ status: 'in_review' }> {
    const draft = await this.getDraft(id);
    draft.status = 'in_review';
    await this.saveDraft(draft);
    return { status: 'in_review' };
  }

  async approve(id: string): Promise<{ status: 'approved' }> {
    const draft = await this.getDraft(id);
    draft.status = 'approved';
    await this.saveDraft(draft);
    return { status: 'approved' };
  }

  async publish(id: string): Promise<{ status: 'published'; forecastJobId: string }> {
    const draft = await this.getDraft(id);
    draft.status = 'published';
    await this.saveDraft(draft);
    return { status: 'published', forecastJobId: `job_${Date.now()}` };
  }

  async searchAnalogs(query: string): Promise<{ items: AnalogProduct[] }> {
    // Mock analog products
    const mockProducts: AnalogProduct[] = [
      { productId: 'sku_001', name: 'Cola Zero 355ml', category: 'Beverages/Cola', price: 12.5 },
      { productId: 'sku_002', name: 'Cola Lime 600ml', category: 'Beverages/Cola', price: 18.0 },
      { productId: 'sku_003', name: 'Cola Cherry 355ml', category: 'Beverages/Cola', price: 13.0 },
      { productId: 'sku_004', name: 'Pepsi Zero 355ml', category: 'Beverages/Cola', price: 12.0 },
      { productId: 'sku_005', name: 'Orange Soda 355ml', category: 'Beverages/Soda', price: 11.5 },
    ];

    const filtered = mockProducts.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase())
    );

    return { items: filtered };
  }

  async getSupplySignals(productId: string): Promise<SupplySignals> {
    return {
      leadTimeDays: 45,
      moq: 5000,
      onHand: 0,
      capacityFlag: false,
    };
  }
}

export class RestLaunchService implements LaunchService {
  private baseUrl = '/api/launches';

  private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    return response.json();
  }

  async createDraft(): Promise<{ id: string }> {
    return this.fetchApi('/drafts', { method: 'POST' });
  }

  async getDraft(id: string): Promise<LaunchDraft> {
    return this.fetchApi(`/drafts/${id}`);
  }

  async saveDraft(draft: LaunchDraft): Promise<LaunchDraft> {
    return this.fetchApi(`/drafts/${draft.id}`, {
      method: 'PUT',
      body: JSON.stringify(draft),
    });
  }

  async simulate(draft: LaunchDraft): Promise<{ scenarios: Scenario[] }> {
    return this.fetchApi('/simulate', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  }

  async submit(id: string): Promise<{ status: 'in_review' }> {
    return this.fetchApi(`/submit/${id}`, { method: 'POST' });
  }

  async approve(id: string): Promise<{ status: 'approved' }> {
    return this.fetchApi(`/approve/${id}`, { method: 'POST' });
  }

  async publish(id: string): Promise<{ status: 'published'; forecastJobId: string }> {
    return this.fetchApi(`/publish/${id}`, { method: 'POST' });
  }

  async searchAnalogs(query: string): Promise<{ items: AnalogProduct[] }> {
    return this.fetchApi(`/analogs?query=${encodeURIComponent(query)}`);
  }

  async getSupplySignals(productId: string): Promise<SupplySignals> {
    return this.fetchApi(`/signals/supply?productId=${encodeURIComponent(productId)}`);
  }
}

// Service factory
export function createLaunchService(): LaunchService {
  const serviceType = import.meta.env.VITE_LAUNCH_SERVICE || 'mock';
  
  switch (serviceType) {
    case 'rest':
      return new RestLaunchService();
    case 'mock':
    default:
      return new MockLaunchService();
  }
}

export const launchService = createLaunchService();