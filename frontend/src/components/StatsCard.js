import React from 'react';
import { cn } from '../utils/helpers';

const colorMap = {
  green: 'text-green-700 bg-green-50 border-green-200',
  red: 'text-red-700 bg-red-50 border-red-200',
  blue: 'text-blue-700 bg-blue-50 border-blue-200',
  purple: 'text-purple-700 bg-purple-50 border-purple-200',
  yellow: 'text-yellow-800 bg-yellow-50 border-yellow-200',
  gray: 'text-gray-700 bg-gray-50 border-gray-200',
};

export default function StatsCard({ title, value, icon: Icon, color = 'gray', description }) {
  return (
    <div className={cn('rounded-xl border p-4 shadow-sm', colorMap[color] || colorMap.gray)}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium opacity-80">{title}</div>
          <div className="text-2xl font-semibold mt-1">{value}</div>
        </div>
        {Icon ? <Icon className="w-6 h-6 opacity-80" /> : null}
      </div>
      {description ? <div className="text-xs mt-3 opacity-70">{description}</div> : null}
    </div>
  );
}
