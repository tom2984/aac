export type DaysLostDataPoint = {
  month: string; // e.g. '2024-01'
  days: number;
  percentChange: number; // e.g. 0.0443 for 4.43%
};

export type DaysLostSeries = {
  reason: 'weather' | 'technical' | 'other';
  data: DaysLostDataPoint[];
};

export const daysLostDummyData: DaysLostSeries[] = [
  {
    reason: 'weather',
    data: [
      { month: '2024-01', days: 1, percentChange: 0 },
      { month: '2024-02', days: 2, percentChange: 1.0 },
      { month: '2024-03', days: 2, percentChange: 0 },
      { month: '2024-04', days: 3, percentChange: 0.5 },
      { month: '2024-05', days: 2, percentChange: -0.33 },
      { month: '2024-06', days: 3, percentChange: 0.5 },
      { month: '2024-07', days: 4, percentChange: 0.33 },
      { month: '2024-08', days: 3, percentChange: -0.25 },
      { month: '2024-09', days: 2, percentChange: -0.33 },
      { month: '2024-10', days: 3, percentChange: 0.5 },
      { month: '2024-11', days: 2, percentChange: -0.33 },
      { month: '2024-12', days: 2, percentChange: 0 },
    ],
  },
  {
    reason: 'technical',
    data: [
      { month: '2024-01', days: 0, percentChange: 0 },
      { month: '2024-02', days: 1, percentChange: 1.0 },
      { month: '2024-03', days: 1, percentChange: 0 },
      { month: '2024-04', days: 2, percentChange: 1.0 },
      { month: '2024-05', days: 1, percentChange: -0.5 },
      { month: '2024-06', days: 2, percentChange: 1.0 },
      { month: '2024-07', days: 2, percentChange: 0 },
      { month: '2024-08', days: 3, percentChange: 0.5 },
      { month: '2024-09', days: 2, percentChange: -0.33 },
      { month: '2024-10', days: 1, percentChange: -0.5 },
      { month: '2024-11', days: 2, percentChange: 1.0 },
      { month: '2024-12', days: 1, percentChange: -0.5 },
    ],
  },
  {
    reason: 'other',
    data: [
      { month: '2024-01', days: 1, percentChange: 0 },
      { month: '2024-02', days: 1, percentChange: 0 },
      { month: '2024-03', days: 2, percentChange: 1.0 },
      { month: '2024-04', days: 1, percentChange: -0.5 },
      { month: '2024-05', days: 2, percentChange: 1.0 },
      { month: '2024-06', days: 1, percentChange: -0.5 },
      { month: '2024-07', days: 2, percentChange: 1.0 },
      { month: '2024-08', days: 2, percentChange: 0 },
      { month: '2024-09', days: 1, percentChange: -0.5 },
      { month: '2024-10', days: 2, percentChange: 1.0 },
      { month: '2024-11', days: 1, percentChange: -0.5 },
      { month: '2024-12', days: 1, percentChange: 0 },
    ],
  },
]; 