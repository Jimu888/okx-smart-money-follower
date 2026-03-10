import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../utils/helpers';

const Item = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium transition',
        isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-200'
      )
    }
  >
    {children}
  </NavLink>
);

export default function Navbar() {
  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="font-semibold text-gray-900">Smart Money Follower</div>
        <div className="flex gap-2">
          <Item to="/">工作台</Item>
          <Item to="/history">交易历史</Item>
        </div>
      </div>
    </div>
  );
}
