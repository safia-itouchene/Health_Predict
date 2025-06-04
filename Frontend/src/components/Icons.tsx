import React from 'react';
import { BarChart3, LineChart, ScatterChart, PieChart, Grid, Activity, TrendingUp, BarChart4, Radar } from 'lucide-react';

export const ChartBarIcon = () => <BarChart3 size={20} className="text-blue-500" />;
export const LineChartIcon = () => <LineChart size={20} className="text-green-500" />;
export const DotChartIcon = () => <ScatterChart size={20} className="text-purple-500" />;
export const PieChartIcon = () => <PieChart size={20} className="text-orange-500" />;
export const GridIcon = () => <Grid size={20} className="text-red-500" />;
export const ActivityIcon = () => <Activity size={20} className="text-teal-500" />;
export const TrendingUpIcon = () => <TrendingUp size={20} className="text-pink-500" />;
export const BarChart4Icon = () => <BarChart4 size={20} className="text-yellow-500" />;
export const RadarIcon = () => <Radar size={20} className="text-indigo-500" />;