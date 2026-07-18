import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Folder, 
  Cloud, 
  Activity, 
  Clock, 
  Plus, 
  Trash2, 
  Terminal, 
  Server, 
  Info, 
  ChevronRight, 
  Globe, 
  X, 
  CheckCircle,
  CodeXml,
  Compass
} from 'lucide-react';
import { Bucket, StorageAnalytics } from './types';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { BucketExplorer } from './components/BucketExplorer';
import { LifecycleManager } from './components/LifecycleManager';
import { S3Playground } from './components/S3Playground';

export default function App() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [activeBucket, setActiveBucket] = useState<Bucket | null>(null);
  const [analytics, setAnalytics] = useState<StorageAnalytics | null>(null);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'lifecycle' | 'docker' | 'playground'>('playground');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // New bucket form
  const [showCreateBucket, setShowCreateBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketRegion, setNewBucketRegion] = useState('us-east-1');
  const [createError, setCreateError] = useState('');

  const fetchBuckets = async () => {
    try {
      const response = await fetch('/api/s3/buckets');
      if (response.ok) {
        const data = await response.json();
        setBuckets(data);
      }
    } catch (e) {
      console.error('Failed to fetch buckets', e);
    }
  };

  const fetchAnalytics = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/s3/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error('Failed to fetch analytics', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Run on startup
  const initializeDashboard = async () => {
    setLoading(true);
    await Promise.all([fetchBuckets(), fetchAnalytics()]);
    setLoading(false);
  };

  useEffect(() => {
    initializeDashboard();
  }, []);

  // Sync callback for any object modification (uploads/deletions/policies)
  const handleDataChange = async () => {
    await Promise.all([fetchBuckets(), fetchAnalytics()]);
  };

  // Create bucket
  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newBucketName.match(/^[a-z0-9.-]{3,63}$/)) {
      setCreateError('Must be 3-63 chars, lowercase letters, numbers, hyphens or dots.');
      return;
    }

    try {
      const response = await fetch('/api/s3/buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBucketName, region: newBucketRegion }),
      });

      if (response.ok) {
        const created = await response.json();
        setBuckets([...buckets, { ...created, object_count: 0, total_size: 0 }]);
        setShowCreateBucket(false);
        setNewBucketName('');
        setNewBucketRegion('us-east-1');
        handleDataChange();
      } else {
        const err = await response.json();
        setCreateError(err.message || 'Bucket creation failed.');
      }
    } catch (e) {
      setCreateError('Network error. Failed to put bucket.');
    }
  };

  // Delete bucket
  const handleDeleteBucket = async (bucketName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm(`Are you sure you want to permanently delete bucket s3://${bucketName}?`)) return;

    try {
      const response = await fetch(`/api/s3/buckets/${bucketName}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (activeBucket?.name === bucketName) {
          setActiveBucket(null);
          setCurrentTab('dashboard');
        }
        handleDataChange();
      } else {
        const err = await response.json();
        alert(err.message || 'Failed to delete bucket.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* S3 Platform Global Header */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Cloud size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-black uppercase tracking-wider text-slate-100">
                S3 Storage Engine
              </h1>
              <span className="bg-slate-800 border border-slate-700 px-1.5 py-0.2 rounded font-mono text-[9px] font-bold text-emerald-400">
                DOCKER SIMULATOR
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Simulated Local Relational Object Block Storage</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="hidden sm:flex items-center space-x-1.5 text-slate-300">
            <Globe size={13} className="text-emerald-400" />
            <span>Host Node Port: 3000</span>
          </div>
          <div className="bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.8 rounded text-emerald-400 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            SQL DB Active
          </div>
        </div>
      </header>

      {/* Main Console Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Side Navigation Control Panel */}
        <aside className="w-full md:w-64 bg-white border-r border-gray-100 shrink-0 flex flex-col justify-between p-4 space-y-6">
          <div className="space-y-5">
            {/* Nav Main Views */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2.5 block mb-1.5">
                Overview
              </span>

              {/* S3 Interactive Playground Navigation */}
              <button
                onClick={() => {
                  setActiveBucket(null);
                  setCurrentTab('playground');
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between transition cursor-pointer ${
                  !activeBucket && currentTab === 'playground'
                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Compass size={15} className="text-blue-600" />
                  <span>S3 Concept Playground</span>
                </div>
                <span className="bg-blue-100 text-blue-800 text-[8px] font-bold px-1.5 py-0.2 rounded-full">NEW</span>
              </button>
              
              {/* Dashboard Navigation */}
              <button
                onClick={() => {
                  setActiveBucket(null);
                  setCurrentTab('dashboard');
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between transition cursor-pointer ${
                  !activeBucket && currentTab === 'dashboard'
                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Activity size={15} />
                  <span>Dashboard & Analytics</span>
                </div>
                <ChevronRight size={12} className="text-gray-400" />
              </button>

              {/* Lifecycle Manager Navigation */}
              <button
                onClick={() => {
                  setActiveBucket(null);
                  setCurrentTab('lifecycle');
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between transition cursor-pointer ${
                  !activeBucket && currentTab === 'lifecycle'
                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Clock size={15} />
                  <span>S3 Lifecycle Policies</span>
                </div>
                <ChevronRight size={12} className="text-gray-400" />
              </button>

              {/* Local Docker Setup Guide */}
              <button
                onClick={() => {
                  setActiveBucket(null);
                  setCurrentTab('docker');
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between transition cursor-pointer ${
                  !activeBucket && currentTab === 'docker'
                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Terminal size={15} />
                  <span>Local Docker Guide</span>
                </div>
                <ChevronRight size={12} className="text-gray-400" />
              </button>
            </div>

            {/* S3 Buckets Registry List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pl-2.5 pr-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  Buckets Registry
                </span>
                <button
                  onClick={() => setShowCreateBucket(true)}
                  className="p-1 hover:bg-gray-50 rounded text-blue-600 hover:text-blue-800 transition cursor-pointer"
                  title="PUT Bucket"
                >
                  <Plus size={14} />
                </button>
              </div>

              {buckets.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic pl-2.5">No active buckets found.</p>
              ) : (
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {buckets.map((b) => (
                    <button
                      key={b.name}
                      onClick={() => {
                        setActiveBucket(b);
                        setCurrentTab('dashboard'); // reset tab view
                      }}
                      className={`w-full text-left px-2.5 py-2 text-xs rounded-lg flex items-center justify-between transition cursor-pointer font-mono group truncate ${
                        activeBucket?.name === b.name
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <Database size={13} className={activeBucket?.name === b.name ? 'text-blue-600' : 'text-gray-400'} />
                        <span className="truncate">{b.name}</span>
                      </div>
                      <span className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 text-red-500 rounded transition shrink-0"
                            onClick={(e) => handleDeleteBucket(b.name, e)}
                            title="Delete Bucket">
                        <Trash2 size={11} />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Infrastructure status block */}
          <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 text-[10px] space-y-2 text-gray-500">
            <p className="font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1">
              <Server size={11} />
              Simulator Specs
            </p>
            <div className="space-y-1 font-mono">
              <p>Relational DB: SQLite SQL</p>
              <p>Platform: Node.js 22</p>
              <p>Storage Engine: FS Volume</p>
            </div>
            <div className="border-t border-gray-200 pt-2 text-[9px] text-gray-400 italic">
              Seeded with 3 default buckets & custom metadata.
            </div>
          </div>
        </aside>

        {/* Center Canvas Main Panel View */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-24 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
              <p className="text-sm font-semibold">Configuring local S3 environment database...</p>
            </div>
          ) : activeBucket ? (
            /* Selected Bucket Object Records Viewer */
            <BucketExplorer bucket={activeBucket} onObjectChange={handleDataChange} />
          ) : currentTab === 'dashboard' ? (
            /* Global Dashboard with Recharts & Logs */
            <AnalyticsDashboard analytics={analytics} onRefresh={fetchAnalytics} loading={refreshing} />
          ) : currentTab === 'lifecycle' ? (
            /* Lifecycle Rules management console */
            <LifecycleManager buckets={buckets} onPolicyChange={handleDataChange} />
          ) : currentTab === 'playground' ? (
            /* S3 Interactive Playground & Concepts Guide */
            <S3Playground />
          ) : (
            /* Local Docker Setup Instructions View */
            <div className="space-y-6">
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-xl text-white">
                  <Terminal size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Local Docker deployment Setup Guide</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Execute the following configuration files and scripts on your developer machine to host this identical Docker containerized architecture.
                  </p>
                </div>
              </div>

              {/* Commands Guide Card */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <CheckCircle className="text-emerald-500" size={16} />
                  1. Local Terminal CLI Commands
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Open your command terminal, navigate to your target project folder, build the object-storage container, and launch it dynamically with detached Docker volumes.
                </p>
                <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-1 border border-slate-900">
                  <p className="text-slate-500"># Step A: Build and compile node-esbuild bundle & SPA client</p>
                  <p className="text-blue-400">docker compose build</p>
                  <p className="text-slate-500"># Step B: Spin up the multi-layer container structure and host port 3000</p>
                  <p className="text-blue-400">docker compose up -d</p>
                  <p className="text-slate-500"># Step C: Stream container console logs for HTTP and SQL event audits</p>
                  <p className="text-blue-400">docker compose logs -f</p>
                </div>
              </div>

              {/* Dockerfile configuration */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <CodeXml className="text-blue-500" size={16} />
                  2. Dockerfile Specification
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Save this script as <code className="bg-gray-100 px-1 py-0.2 rounded font-mono text-[10px] text-gray-700">Dockerfile</code> in your root workspace. It uses Node 22 Alpine, mounts volume configurations, bundles the server entry point, and binds container ingress to port 3000.
                </p>
                <pre className="bg-slate-950 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-72 border border-slate-900 leading-relaxed">
{`FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]`}
                </pre>
              </div>

              {/* docker-compose configuration */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Compass className="text-purple-500" size={16} />
                  3. Docker Compose YAML Configuration
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Save this script as <code className="bg-gray-100 px-1 py-0.2 rounded font-mono text-[10px] text-gray-700">docker-compose.yml</code> to bundle file mounting logic and preserve SQLite relational records directly onto your local disk.
                </p>
                <pre className="bg-slate-950 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-72 border border-slate-900 leading-relaxed">
{`version: '3.8'

services:
  s3-simulator:
    build: .
    container_name: s3-object-storage
    ports:
      - "3000:3000"
    volumes:
      # Mounting data folder preserves SQL db files and bucket binaries on host system
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - APP_URL=http://localhost:3000
    restart: always`}
                </pre>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Put Bucket Modal Overlay */}
      {showCreateBucket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm p-5 shadow-xl relative animate-in fade-in zoom-in duration-150">
            <button 
              onClick={() => {
                setShowCreateBucket(false);
                setCreateError('');
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-2">
              <Database className="text-blue-500" size={18} />
              PUT Bucket (Create S3 Bucket)
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Allocate a new isolated partition in the SQL storage system.
            </p>

            <form onSubmit={handleCreateBucket} className="space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase block">Bucket Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. static-media-assets"
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value)}
                  className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2 bg-white"
                />
              </div>

              {/* Region */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase block">Region Domain</label>
                <select
                  value={newBucketRegion}
                  onChange={(e) => setNewBucketRegion(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white"
                >
                  <option value="us-east-1">US East (N. Virginia) • us-east-1</option>
                  <option value="us-west-2">US West (Oregon) • us-west-2</option>
                  <option value="eu-central-1">Europe (Frankfurt) • eu-central-1</option>
                  <option value="ap-south-1">Asia Pacific (Mumbai) • ap-south-1</option>
                </select>
              </div>

              {createError && (
                <p className="text-[10px] text-red-600 font-semibold leading-relaxed bg-red-50 p-2 border border-red-100 rounded-lg">
                  {createError}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-lg transition"
              >
                Create Bucket Partition
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
