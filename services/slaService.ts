
import { Priority, ServiceRequest } from '../types';
import { SLA_HOURS } from '../constants';

export interface SLAMetrics {
  progress: number;
  isUrgent: boolean;
  isExpired: boolean;
  remainingTimeLabel: string;
}

export const calculateSLA = (request: ServiceRequest): SLAMetrics => {
  const start = new Date(request.createdAt).getTime();
  const limit = new Date(request.slaLimit).getTime();
  const now = Date.now();

  const total = limit - start;
  const elapsed = now - start;
  
  const progress = Math.min(Math.max(Math.round((elapsed / total) * 100), 0), 100);
  const isExpired = now > limit;
  const isUrgent = progress >= 75 && !isExpired;

  const diffMs = limit - now;
  const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
  const diffMins = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60));

  let remainingTimeLabel = isExpired 
    ? `Atrasado há ${diffHours}h ${diffMins}m` 
    : `Restam ${diffHours}h ${diffMins}m`;

  return { progress, isUrgent, isExpired, remainingTimeLabel };
};
