'use client';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, Area, AreaChart
} from 'recharts';

interface ChartProps {
  type: 'trend' | 'category' | 'balance' | 'week';
  data: any[];
}

const formatK = (v: number) => {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(v);
};

const tooltipFormat = (value: number) => [`₺${value?.toLocaleString?.('tr-TR', { minimumFractionDigits: 2 }) ?? '0'}`, ''];

export default function DashboardCharts({ type, data }: ChartProps) {
  const safeData = data ?? [];
  if (safeData.length === 0) {
    return <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Veri bulunmuyor</div>;
  }

  if (type === 'balance') {
    return (
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={safeData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 9 }} tickFormatter={(d: string) => { const parts = d.split('-'); return `${parts[2]}/${parts[1]}`; }} />
            <YAxis tickLine={false} tick={{ fontSize: 9 }} tickFormatter={(v: number) => `₺${formatK(v)}`} />
            <Tooltip formatter={tooltipFormat} contentStyle={{ fontSize: 11 }} labelFormatter={(d: string) => { const parts = String(d).split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; }} />
            <Area type="monotone" dataKey="balance" stroke="#10B981" strokeWidth={2} fill="url(#balGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'week') {
    return (
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={safeData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <XAxis dataKey="shortDay" tickLine={false} tick={{ fontSize: 9 }} />
            <YAxis tickLine={false} tick={{ fontSize: 9 }} tickFormatter={(v: number) => `₺${formatK(v)}`} />
            <Tooltip formatter={tooltipFormat} contentStyle={{ fontSize: 11 }} />
            <Bar dataKey="expense" name="Gider" fill="#EF4444" radius={[3, 3, 0, 0]} />
            <Bar dataKey="income" name="Gelir" fill="#10B981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // fallback trend (used in reports)
  if (type === 'trend') {
    return (
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={safeData} margin={{ top: 5, right: 5, left: 0, bottom: 20 }}>
            <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 10 }} />
            <YAxis tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${formatK(v)}`} />
            <Tooltip formatter={tooltipFormat} contentStyle={{ fontSize: 11 }} />
            <Bar dataKey="income" name="Gelir" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Gider" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
