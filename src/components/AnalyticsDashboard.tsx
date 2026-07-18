import React from 'react';
import { 
  Database, 
  FileCode, 
  HardDrive, 
  Link, 
  Download, 
  RefreshCw, 
  Clock, 
  Activity, 
  File, 
  Trash2, 
  Archive, 
  Upload, 
  PlusCircle, 
  Settings 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts';
import { StorageAnalytics, StorageLog } from '../types';

interface AnalyticsDashboardProps {
  analytics: StorageAnalytics | null;
  onRefresh: () => void;
  loading: boolean;
}

// Byte formatter helper
export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Colors for Pie/Bar charts
const COLOR_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1', '#14b8a6'];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ analytics, onRefresh, loading }) => {
  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500 h-[60vh]">
        <RefreshCw className="animate-spin mb-4 text-blue-500" size={32} />
        <p>Loading object storage analytics...</p>
      </div>
    );
  }

  const { stats, bucketDistribution, mimeDistribution, recentLogs, storageTrend } = analytics;

  // Custom log icon and badge color resolver
  const getLogBadge = (type: StorageLog['event_type']) => {
    switch (type) {
      case 'upload':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'UPLOAD',
          icon: <Upload size={12} className="mr-1" />
        };
      case 'download':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'GET OBJECT',
          icon: <Download size={12} className="mr-1" />
        };
      case 'delete':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          label: 'DELETE',
          icon: <Trash2 size={12} className="mr-1" />
        };
      case 'link_create':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          label: 'PRESIGN',
          icon: <Link size={12} className="mr-1" />
        };
      case 'link_access':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          label: 'PUBLIC ACCESS',
          icon: <Clock size={12} className="mr-1" />
        };
      case 'lifecycle':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'LIFECYCLE',
          icon: <Archive size={12} className="mr-1" />
        };
      case 'bucket_create':
        return {
          bg: 'bg-teal-50 text-teal-700 border-teal-200',
          label: 'PUT BUCKET',
          icon: <PlusCircle size={12} className="mr-1" />
        };
      case 'bucket_delete':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'DELETE BUCKET',
          icon: <Trash2 size={12} className="mr-1" />
        };
      default:
        return {
          bg: 'bg-gray-50 text-gray-700 border-gray-200',
          label: 'API EVENT',
          icon: <Settings size={12} className="mr-1" />
        };
    }
  };

  // Convert mime distribution for Pie Chart
  const pieData = mimeDistribution.map((m, i) => ({
    name: m.mimeType.split('/')[1] || m.mimeType,
    value: m.count,
    bytes: m.totalBytes
  }));

  return (
    <div className="space-y-6">
      {/* Analytics Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Storage Dashboard & Analytics</h2>
          <p className="text-sm text-gray-500">Real-time relational audit log and S3 engine monitoring stats</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Bento Grid Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Database size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Buckets</p>
            <p className="text-2xl font-bold text-gray-900">{stats.bucketsCount}</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileCode size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Objects</p>
            <p className="text-2xl font-bold text-gray-900">{stats.objectsCount}</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <HardDrive size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Allocated Space</p>
            <p className="text-xl font-bold text-gray-900 truncate" title={formatBytes(stats.totalSize)}>
              {formatBytes(stats.totalSize, 1)}
            </p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Link size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Active Links</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeLinksCount}</p>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs col-span-2 lg:col-span-1 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Download size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">API Downloads</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalDownloads}</p>
          </div>
        </div>
      </div>

      {/* Graphs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Growth Area Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
            <Activity className="text-blue-500 w-4 h-4" />
            File Upload Volume Trend
          </h3>
          <div className="h-64">
            {storageTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No storage growth trend logged yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={storageTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBytes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any, name: any) => {
                      if (name === 'bytesAdded') return [formatBytes(value), 'Storage Footprint'];
                      return [value, 'Files Uploaded'];
                    }}
                  />
                  <Area type="monotone" dataKey="bytesAdded" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorBytes)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Mime Type Footprints */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
            <File className="text-emerald-500 w-4 h-4" />
            Object Type Footprint Breakdown
          </h3>
          <div className="h-64 flex flex-col md:flex-row items-center justify-between">
            {pieData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
                No object files detected.
              </div>
            ) : (
              <>
                <div className="w-full md:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value: any, name: any, props: any) => [
                          `${value} files (${formatBytes(props.payload.bytes)})`, 
                          name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-2 overflow-y-auto max-h-56 pr-2">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full block shrink-0" 
                          style={{ backgroundColor: COLOR_PALETTE[i % COLOR_PALETTE.length] }} 
                        />
                        <span className="font-medium text-gray-700 truncate max-w-[120px]" title={d.name}>
                          {d.name.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-gray-400 font-mono">
                        {d.value} {d.value === 1 ? 'file' : 'files'} ({formatBytes(d.bytes, 0)})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bucket distribution bar progress meters */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
          <Database className="text-indigo-500 w-4 h-4" />
          Bucket Allocated Space Distribution
        </h3>
        <div className="space-y-4">
          {bucketDistribution.length === 0 ? (
            <p className="text-center py-6 text-sm text-gray-400">No bucket distribution metrics.</p>
          ) : (
            bucketDistribution.map((b, i) => {
              const maxSpace = stats.totalSize || 1;
              const percentage = Math.round((b.totalBytes / maxSpace) * 100);
              return (
                <div key={b.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-gray-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      s3://{b.name}
                    </span>
                    <span className="text-gray-500 font-mono font-medium">
                      {formatBytes(b.totalBytes)} ({percentage}%) • {b.objectCount} {b.objectCount === 1 ? 'object' : 'objects'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.max(percentage, b.totalBytes > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* S3 REST Event Log Timeline */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
          <Clock className="text-purple-500 w-4 h-4" />
          S3 Engine REST Event Log Stream (Relational Logs)
        </h3>
        <div className="overflow-hidden border border-gray-100 rounded-lg">
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No storage API interactions recorded yet. Try creating buckets or uploading files!
              </div>
            ) : (
              recentLogs.map((log) => {
                const badge = getLogBadge(log.event_type);
                return (
                  <div key={log.id} className="p-3 hover:bg-gray-50 transition flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                    <div className="flex items-start md:items-center space-x-3 min-w-0">
                      <span className={`px-2 py-0.5 rounded border font-semibold shrink-0 flex items-center ${badge.bg}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                      <div className="min-w-0">
                        <p className="text-gray-700 font-medium truncate max-w-lg md:max-w-2xl">{log.details}</p>
                        <div className="flex items-center space-x-2 text-[10px] text-gray-400 mt-0.5">
                          {log.bucket_name && (
                            <span className="bg-gray-100 px-1 py-0.2 rounded font-mono text-gray-600">
                              bucket: {log.bucket_name}
                            </span>
                          )}
                          {log.object_key && (
                            <span className="bg-gray-100 px-1 py-0.2 rounded font-mono text-gray-600 max-w-[150px] truncate">
                              key: {log.object_key}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono shrink-0 text-right">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
