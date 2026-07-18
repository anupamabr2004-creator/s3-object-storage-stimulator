import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  Archive, 
  Trash2, 
  Settings, 
  PlusCircle, 
  Zap, 
  Calendar, 
  CheckCircle, 
  Info, 
  Database 
} from 'lucide-react';
import { Bucket, LifecyclePolicy } from '../types';

interface LifecycleManagerProps {
  buckets: Bucket[];
  onPolicyChange: () => void;
}

export const LifecycleManager: React.FC<LifecycleManagerProps> = ({ buckets, onPolicyChange }) => {
  const [selectedBucket, setSelectedBucket] = useState('');
  const [prefix, setPrefix] = useState('');
  const [daysToArchive, setDaysToArchive] = useState('14');
  const [daysToDelete, setDaysToDelete] = useState('30');
  const [policies, setPolicies] = useState<(LifecyclePolicy & { bucket_name: string })[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Simulation and sweeper states
  const [simulateDays, setSimulateDays] = useState('30');
  const [simulating, setSimulating] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<{ archived: number; deleted: number; message: string } | null>(null);
  const [simulateSuccess, setSimulateSuccess] = useState<string | null>(null);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const allPolicies: (LifecyclePolicy & { bucket_name: string })[] = [];
      for (const bucket of buckets) {
        const response = await fetch(`/api/s3/buckets/${bucket.name}/lifecycle`);
        if (response.ok) {
          const list: LifecyclePolicy[] = await response.json();
          list.forEach(p => {
            allPolicies.push({ ...p, bucket_name: bucket.name });
          });
        }
      }
      setPolicies(allPolicies);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (buckets.length > 0) {
      setSelectedBucket(buckets[0].name);
      fetchPolicies();
    }
  }, [buckets]);

  // Create policy handler
  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBucket) return;

    try {
      const response = await fetch(`/api/s3/buckets/${selectedBucket}/lifecycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: prefix.trim() || null,
          daysToArchive: daysToArchive ? parseInt(daysToArchive, 10) : null,
          daysToDelete: daysToDelete ? parseInt(daysToDelete, 10) : null,
        }),
      });

      if (response.ok) {
        setPrefix('');
        setDaysToArchive('14');
        setDaysToDelete('30');
        fetchPolicies();
        onPolicyChange();
        alert('S3 Lifecycle policy created successfully!');
      } else {
        const err = await response.json();
        alert(err.message || 'Failed to create policy.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Run Manual Sweeper Sweep
  const handleRunSweeper = async () => {
    setSweeping(true);
    setSweepResult(null);
    try {
      const response = await fetch('/api/s3/lifecycle/run', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        setSweepResult({
          archived: result.archivedCount,
          deleted: result.deletedCount,
          message: result.message
        });
        onPolicyChange(); // reload stats and event logs!
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSweeping(false);
    }
  };

  // Run Time Simulation
  const handleSimulateTime = async () => {
    setSimulating(true);
    setSimulateSuccess(null);
    try {
      const response = await fetch('/api/s3/simulate-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: simulateDays }),
      });
      if (response.ok) {
        const data = await response.json();
        setSimulateSuccess(data.message);
        onPolicyChange(); // update metrics!
        setTimeout(() => setSimulateSuccess(null), 5000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* S3 Lifecycle Explanation Header */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">S3 Automated Object Lifecycle Engine</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure rules to optimize storage costs. Active files can automatically transition to <span className="font-semibold text-amber-600">Archive (Glacier simulated storage)</span> or be permanently <span className="font-semibold text-red-600">Deleted (Expired)</span> as they age.
          </p>
        </div>
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
          <Clock size={24} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Policy Config Form */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
            <PlusCircle className="text-blue-500 w-4.5 h-4.5" />
            Add S3 Lifecycle Policy Rule
          </h3>

          {buckets.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-6">Please create a bucket first before adding policies.</p>
          ) : (
            <form onSubmit={handleCreatePolicy} className="space-y-4">
              {/* Select Target Bucket */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Target Bucket
                </label>
                <select
                  value={selectedBucket}
                  onChange={(e) => setSelectedBucket(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-white font-mono"
                >
                  {buckets.map(b => (
                    <option key={b.name} value={b.name}>s3://{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Prefix (Key filter) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Key Prefix Path (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. logs/ (or leave blank for all)"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2.5 bg-white"
                />
                <p className="text-[10px] text-gray-400">Rule applies only to files starting with this prefix</p>
              </div>

              {/* Days to Transition Archive */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Transition to ARCHIVE (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 14 days"
                  value={daysToArchive}
                  onChange={(e) => setDaysToArchive(e.target.value)}
                  className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2.5 bg-white"
                />
                <p className="text-[10px] text-gray-400">Files matching prefix turn to Archived (Glacier) status</p>
              </div>

              {/* Days to Expire Delete */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Transition to EXPIRED DELETE (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 30 days"
                  value={daysToDelete}
                  onChange={(e) => setDaysToDelete(e.target.value)}
                  className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2.5 bg-white"
                />
                <p className="text-[10px] text-gray-400">Files are permanently deleted from disk and database</p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-lg transition"
              >
                Apply Lifecycle Policy
              </button>
            </form>
          )}
        </div>

        {/* Existing S3 Rules (Col Span 2) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Active Policies Table */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <Settings className="text-purple-500 w-4.5 h-4.5" />
              Active Relational S3 Policies
            </h3>

            {policies.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-10 bg-gray-50 border border-gray-100 rounded-xl">
                No active lifecycle policy rules defined. Define a policy rule on the left to activate auto-cleanup!
              </p>
            ) : (
              <div className="space-y-3">
                {policies.map((p) => (
                  <div key={p.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50/50 transition">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-150 font-bold px-2 py-0.5 rounded font-mono">
                          s3://{p.bucket_name}
                        </span>
                        <p className="text-xs text-gray-800 font-semibold mt-1">
                          Filter Target Prefix: <code className="bg-gray-100 px-1 py-0.2 rounded font-mono text-[10px]">{p.prefix || 'All objects (*)'}</code>
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">Rule ID: #{p.id}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100 text-xs">
                      <div className="flex items-center gap-2 text-amber-700 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                        <Archive size={14} />
                        <div>
                          <p className="font-bold text-[10px] uppercase">Archive Threshold</p>
                          <p className="font-semibold">{p.days_to_archive ? `${p.days_to_archive} days` : 'Disabled'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-red-700 bg-red-50/50 p-2 rounded-lg border border-red-100">
                        <Trash2 size={14} />
                        <div>
                          <p className="font-bold text-[10px] uppercase">Expiration Delete</p>
                          <p className="font-semibold">{p.days_to_delete ? `${p.days_to_delete} days` : 'Disabled'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Simulator and Evaluation Panel */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md border border-slate-800">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5 text-blue-400">
              <Zap className="animate-pulse text-amber-400" size={16} />
              Simulated S3 Sandbox Controls
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Because days don't pass instantly in local environments, use this panel to warp the database files backward in time, then sweep rules to inspect object behaviors in real-time.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: Time warp */}
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Calendar size={12} />
                  Passage of Time Simulator
                </span>

                <div className="space-y-2">
                  <label className="text-xs text-slate-300 block">Ages all current objects by:</label>
                  <select
                    value={simulateDays}
                    onChange={(e) => setSimulateDays(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-700 text-white p-2 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="5">5 Days (Triggers 5+ day rules)</option>
                    <option value="15">15 Days (Triggers 15+ day rules)</option>
                    <option value="35">35 Days (Triggers 30+ day rules)</option>
                    <option value="95">95 Days (Triggers 90+ day rules)</option>
                  </select>
                </div>

                <button
                  onClick={handleSimulateTime}
                  disabled={simulating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {simulating ? 'Warping Timeline...' : 'Fast-Forward Time ⏰'}
                </button>

                {simulateSuccess && (
                  <p className="text-[10px] text-emerald-400 font-semibold bg-emerald-900/30 p-2 border border-emerald-800 rounded-lg text-center">
                    {simulateSuccess}
                  </p>
                )}
              </div>

              {/* Box 2: Manual Sweeper Trigger */}
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1 mb-2">
                    <ShieldAlert size={12} className="text-amber-400" />
                    Cron Lifecycle Engine Manual Run
                  </span>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Triggers the relational sweeper algorithm. Looks at object age and compares it with your policies to archive or delete files on disk.
                  </p>
                </div>

                <button
                  onClick={handleRunSweeper}
                  disabled={sweeping}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold py-2 rounded-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle size={14} />
                  {sweeping ? 'Executing Sweep...' : 'Run S3 Lifecycle Sweep'}
                </button>

                {sweepResult && (
                  <div className="text-[10px] bg-slate-900 p-2.5 rounded-lg border border-slate-700 space-y-1">
                    <p className="text-amber-400 font-semibold">{sweepResult.message}</p>
                    <div className="flex justify-between text-slate-400 font-mono pt-1 border-t border-slate-800">
                      <span>Archived: {sweepResult.archived}</span>
                      <span>Deleted: {sweepResult.deleted}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
