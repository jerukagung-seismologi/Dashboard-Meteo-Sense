// Gunakan lucide-react untuk icon
import React from "react";
import {
  Home,
  Grid,
  Bell,
  Cpu,
  ChartBar,
  Calendar,
  Download,
  Lightbulb,
  Settings,
  User,
  ArrowUp,
  ArrowDown,
  LogOut,
  RefreshCw,
  Tag,
  MoreHorizontal,
  Thermometer,
  Droplets,
  Sun,
  Sprout,
  AlertTriangle,
  Check,
  Mail,
  Bell as LucideBell,
  Pencil,
  CheckSquare,
  X,
  Key,
} from "lucide-react";

const HomeIcon = (props: React.ComponentProps<typeof Home>) => (
  <Home size={20} {...props} />
);
const GridIcon = (props: React.ComponentProps<typeof Grid>) => (
  <Grid size={20} {...props} />
);
const BellIcon = (props: React.ComponentProps<typeof Bell>) => (
  <Bell size={20} {...props} />
);
const DeviceIcon = (props: React.ComponentProps<typeof Cpu>) => (
  <Cpu size={20} {...props} />
);
const CalendarIcon = (props: React.ComponentProps<typeof Calendar>) => (
  <Calendar size={20} {...props} />
);
const ChartBarIcon = (props: React.ComponentProps<typeof ChartBar>) => (
  <ChartBar size={20} {...props} />
);
const DownloadIcon = (props: React.ComponentProps<typeof Download>) => (
  <Download size={20} {...props} />
);
const BIIcon = (props: React.ComponentProps<typeof Lightbulb>) => (
  <Lightbulb size={20} {...props} />
);
const SettingsIcon = (props: React.ComponentProps<typeof Settings>) => (
  <Settings size={20} {...props} />
);
const UserIcon = (props: React.ComponentProps<typeof User>) => (
  <User size={64} {...props} /> // 64px agar mirip w-16 h-16
);
const ArrowUpIcon = (props: React.ComponentProps<typeof ArrowUp>) => (
  <ArrowUp size={18} {...props} />
);
const ArrowDownIcon = (props: React.ComponentProps<typeof ArrowDown>) => (
  <ArrowDown size={18} {...props} />
);
const LogOutIcon = (props: React.ComponentProps<typeof LogOut>) => (
  <LogOut size={20} {...props} />
);
const RefreshIcon = (props: React.ComponentProps<typeof RefreshCw>) => (
  <RefreshCw size={18} {...props} />
);
const TagIcon = (props: React.ComponentProps<typeof Tag>) => (
  <Tag size={18} {...props} />
);
const MoreIcon = (props: React.ComponentProps<typeof MoreHorizontal>) => (
  <MoreHorizontal size={18} {...props} />
);

// Sensor icons with color
const TemperatureIcon = (props: React.ComponentProps<typeof Thermometer>) => (
  <Thermometer size={20} color="#ef4444" {...props} />
);
const HumidityIcon = (props: React.ComponentProps<typeof Droplets>) => (
  <Droplets size={20} color="#3b82f6" {...props} />
);
const LightIntensityIcon = (props: React.ComponentProps<typeof Sun>) => (
  <Sun size={20} color="#f59e0b" {...props} />
);
const MoistureIcon = (props: React.ComponentProps<typeof Sprout>) => (
  <Sprout size={20} color="#10b981" {...props} />
);

// Tambahkan ikon untuk Alerts page
const WarningIcon = (props: React.ComponentProps<typeof AlertTriangle>) => (
  <AlertTriangle size={20} {...props} />
);
const CheckIcon = (props: React.ComponentProps<typeof Check>) => (
  <Check size={18} {...props} />
);
const EmailIcon = (props: React.ComponentProps<typeof Mail>) => (
  <Mail size={18} {...props} />
);
const NotificationIcon = (props: React.ComponentProps<typeof LucideBell>) => (
  <LucideBell size={18} {...props} />
);
const EditIcon = (props: React.ComponentProps<typeof Pencil>) => (
  <Pencil size={18} {...props} />
);
const SaveIcon = (props: React.ComponentProps<typeof CheckSquare>) => (
  <CheckSquare size={18} {...props} />
);
const CancelIcon = (props: React.ComponentProps<typeof X>) => (
  <X size={18} {...props} />
);
const KeyIcon = (props: React.ComponentProps<typeof Key>) => (
  <Key size={18} {...props} />
);
const NotificationIcon2 = (props: React.ComponentProps<typeof Bell>) => (
  <Bell size={18} {...props} />
);

export {
  HomeIcon,
  GridIcon,
  BIIcon,
  BellIcon,
  DeviceIcon,
  CalendarIcon,
  ChartBarIcon,
  DownloadIcon,
  SettingsIcon,
  UserIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  LogOutIcon,
  RefreshIcon,
  TagIcon,
  MoreIcon,
  TemperatureIcon,
  HumidityIcon,
  LightIntensityIcon,
  MoistureIcon,
  WarningIcon,
  CheckIcon,
  EmailIcon,
  NotificationIcon,
  EditIcon,
  SaveIcon,
  CancelIcon,
  KeyIcon,
  NotificationIcon2,
};
