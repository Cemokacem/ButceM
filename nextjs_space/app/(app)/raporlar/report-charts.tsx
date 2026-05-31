'use client';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart,
  ComposedChart
} from 'recharts';

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#FF90BB', '#FF6363', '#80D8C3', '#A19AD3', '#72BF78', '#F59E0B', '#06B6D4'];

interface ChartProps {
  type: 'monthly' | 'category' | 'accounts';
  data: any[];
}

export default function ReportCharts({ type, data }: ChartProps) {
  const safeData = data ?? [];

  if (safeData.length === 0) {
    return <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Veri bulunmuyor</div>;
  }

  if (type === 'monthly') {
    return (
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={safeData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
            <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
            <YAxis tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(value: number) => [`₺${value?.toLocaleString?.('tr-TR') ?? '0'}`, '']} contentStyle={{ fontSize: 11 }} />
            <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="income" name="Gelir" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Gider" fill="#EF4444" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="net" name="Net" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'category') {
    return (
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={safeData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
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

  if (type === 'accounts') {
    return (
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={safeData} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
            <XAxis type="number" tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
            <YAxis type="category" dataKey="name" tickLine={false} tick={{ fontSize: 10 }} width={55} />
            <Tooltip formatter={(value: number) => [`₺${value?.toLocaleString?.('tr-TR') ?? '0'}`, 'Bakiye']} contentStyle={{ fontSize: 11 }} />
            <Bar dataKey="balance" name="Bakiye" radius={[0, 4, 4, 0]}>
              {safeData.map((entry: any, index: number) => (
                <Cell key={index} fill={entry?.color ?? COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
