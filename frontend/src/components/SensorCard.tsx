import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';

interface SensorCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  status: 'normal' | 'warning' | 'critical';
  lastUpdated: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

export const SensorCard: React.FC<SensorCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  status,
  lastUpdated,
  trend,
  trendValue,
}) => {
  const statusColors = {
    normal: 'text-primary bg-primary/10',
    warning: 'text-amber-500 bg-amber-500/10',
    critical: 'text-destructive bg-destructive/10',
  };

  const statusBorder = {
    normal: 'border-primary/20',
    warning: 'border-amber-500/30',
    critical: 'border-destructive/30',
  };

  const TrendIcon = () => {
    if (!trend) return null;
    if (trend === 'up') return <span className="text-destructive text-xs">↑ {trendValue}</span>;
    if (trend === 'down') return <span className="text-primary text-xs">↓ {trendValue}</span>;
    return <span className="text-muted-foreground text-xs">→ stable</span>;
  };

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
      <Card className={cn("overflow-hidden backdrop-blur-sm bg-card/90", statusBorder[status])}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={cn("p-2 rounded-full", statusColors[status])}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {value} {unit && <span className="text-lg font-normal text-muted-foreground">{unit}</span>}
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-muted-foreground">
              Updated: {lastUpdated}
            </div>
            <TrendIcon />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
