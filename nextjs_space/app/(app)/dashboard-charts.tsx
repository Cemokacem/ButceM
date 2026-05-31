'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#FF90BB', '#FF6363', '#80D8C3', '#A19AD3', '#72BF78'];

interface ChartProps {
  type: 'trend' | 'category';
  data: any[];
}

export default function DashboardCharts({ type, data }: ChartProps) {
  const safeData = data ?? [];

  if (type === 'trend') {
    if (safeData.length === 0) {
      return <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Veri bulunmuyor</div>;
    }
    return (
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={safeData} margin={{ top: 5, right: 5, left: 0, bottom: 20 }}>
            <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 10 }} />
            <YAxis tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(value: number) => [`₺${value?.toLocaleString?.('tr-TR') ?? '0'}`, '']} contentStyle={{ fontSize: 11 }} />
            <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="income" name="Gelir" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Gider" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'category') {
    if (safeData.length === 0) {
      return <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Bu ay gider bulunmuyor</div>;
    }
    return (
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={safeData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={3}
              dataKey="total"
              nameKey="name"
            >
              {safeData.map((entry: any, index: number) => (
                <Cell key={index} fill={entry?.color ?? COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`₺${value?.toLocaleString?.('tr-TR') ?? '0'}`, '']} contentStyle={{ fontSize: 11 }} />
            <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
