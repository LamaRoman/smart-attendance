import {
  Thermometer, Umbrella, Sun, Ban, Baby, User,
  Clock, CheckCircle, XCircle,
} from 'lucide-react';

export const LEAVE_TYPES = [
  { value: 'SICK',      label: 'बिरामी बिदा',   labelEn: 'Sick Leave',      icon: Thermometer, accent: 'border-l-rose-400',  iconColor: 'text-rose-500'  },
  { value: 'CASUAL',    label: 'आकस्मिक बिदा',  labelEn: 'Casual Leave',    icon: Umbrella,    accent: 'border-l-blue-400',  iconColor: 'text-blue-500'  },
  { value: 'ANNUAL',    label: 'वार्षिक बिदा',   labelEn: 'Annual Leave',    icon: Sun,         accent: 'border-l-amber-400', iconColor: 'text-amber-500' },
  { value: 'UNPAID',    label: 'बिना तलब बिदा', labelEn: 'Unpaid Leave',    icon: Ban,         accent: 'border-l-slate-400', iconColor: 'text-slate-500' },
  { value: 'MATERNITY', label: 'प्रसूति बिदा',   labelEn: 'Maternity Leave', icon: Baby,        accent: 'border-l-pink-400',  iconColor: 'text-pink-500'  },
  { value: 'PATERNITY', label: 'पितृत्व बिदा',   labelEn: 'Paternity Leave', icon: User,        accent: 'border-l-cyan-400',  iconColor: 'text-cyan-500'  },
];

export const STATUS_CONFIG: Record<string, {
  color: string;
  bg: string;
  icon: typeof CheckCircle;
  label: string;
  labelNp: string;
}> = {
  PENDING:  { color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     icon: Clock,       label: 'Pending',  labelNp: 'विचाराधीन' },
  APPROVED: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle, label: 'Approved', labelNp: 'स्वीकृत'   },
  REJECTED: { color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200',       icon: XCircle,     label: 'Rejected', labelNp: 'अस्वीकृत'  },
};

// Current BS year approximation (same formula used across the project)
const now = new Date();
export const CURRENT_BS_YEAR = now.getMonth() >= 3
  ? now.getFullYear() + 57
  : now.getFullYear() + 56;