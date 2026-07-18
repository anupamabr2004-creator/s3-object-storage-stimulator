import React, { useState } from 'react';
import { 
  Compass, 
  HelpCircle, 
  Database, 
  FileText, 
  Link2, 
  Clock, 
  ArrowRight, 
  PiggyBank, 
  Server, 
  FolderPlus, 
  DollarSign, 
  CheckCircle, 
  Layers, 
  Eye, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';

export const S3Playground: React.FC = () => {
  // Concept selector state
  const [activeConcept, setActiveConcept] = useState<'bucket' | 'flat-key' | 'presigned' | 'lifecycle'>('bucket');

  // Key Folder Simulator state
  const [inputKey, setInputKey] = useState('documents/invoices/july_invoice.pdf');
  const [flatResult, setFlatResult] = useState<string[]>([
    'documents/invoices/july_invoice.pdf'
  ]);

  // Storage Cost Calculator state
  const [totalDataGB, setTotalDataGB] = useState(5000); // 5 TB default
  const [hotRatio, setHotRatio] = useState(80); // 80% Hot, 20% Cold

  // Pre-signed URL playground state
  const [simObjectName, setSimObjectName] = useState('secret_blueprint.png');
  const [simMinutes, setSimMinutes] = useState(1);
  const [simulatingLink, setSimulatingLink] = useState(false);
  const [simulatedToken, setSimulatedToken] = useState('');
  const [timerCount, setTimerCount] = useState(0);

  // Key Folder addition helper
  const handleSimulateKey = () => {
    if (!inputKey.trim()) return;
    if (!flatResult.includes(inputKey.trim())) {
      setFlatResult([...flatResult, inputKey.trim()]);
    }
  };

  const clearSimulatedKeys = () => {
    setFlatResult([]);
  };

  const addPresetKeys = () => {
    setFlatResult([
      'images/avatars/john_profile.png',
      'images/avatars/mary_profile.png',
      'images/vacation/sunset.jpg',
      'backups/db_dump_2026.sql',
      'system-logs/nginx/error.log',
      'system-logs/nginx/access.log'
    ]);
  };

  // Pre-signed signing simulator
  const handleSimulateSigning = () => {
    setSimulatingLink(true);
    setTimeout(() => {
      const randomSig = Math.random().toString(16).substring(2, 10) + '...' + Math.random().toString(16).substring(2, 10);
      const host = window.location.origin;
      const fakeUrl = `${host}/api/s3/download/${simObjectName}?expires=${Date.now() + simMinutes * 60000}&signature=amz_sig_${randomSig}`;
      setSimulatedToken(fakeUrl);
      setTimerCount(simMinutes * 60);
      setSimulatingLink(false);
    }, 600);
  };

  // Cost calculation helper
  const standardCostPerGB = 0.023; // AWS S3 Standard pricing
  const glacierCostPerGB = 0.0036; // AWS S3 Glacier Deep Archive pricing

  const hotGB = (totalDataGB * hotRatio) / 100;
  const coldGB = (totalDataGB * (100 - hotRatio)) / 100;

  const hotCost = hotGB * standardCostPerGB;
  const coldCost = coldGB * glacierCostPerGB;
  const currentTotalCost = hotCost + coldCost;
  const traditionalTotalCost = totalDataGB * standardCostPerGB;
  const monthlySavings = traditionalTotalCost - currentTotalCost;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Educational Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="bg-indigo-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
                S3 EDUCATION SANDBOX
              </span>
              <span className="text-xs text-indigo-200 font-mono">Approachability Upgrade</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Demystifying Cloud Object Storage
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-3xl">
              Standard file systems organize items in rigid nested folders on physical hardware. S3 (Simple Storage Service) is different: it is an API-driven <span className="font-semibold text-white">key-value database</span>. This playground translates complex infrastructure concepts into visual, hands-on interactives so anyone can master it.
            </p>
          </div>
          <div className="p-4 bg-indigo-500/10 border border-indigo-400/20 rounded-2xl shrink-0 flex items-center justify-center text-indigo-400 animate-pulse">
            <Compass size={40} />
          </div>
        </div>
      </div>

      {/* S3 Glossary / Concept Selector */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Concept 1 */}
        <button
          onClick={() => setActiveConcept('bucket')}
          className={`p-4 rounded-xl text-left border transition cursor-pointer ${
            activeConcept === 'bucket'
              ? 'bg-blue-50 border-blue-200 shadow-2xs'
              : 'bg-white border-gray-150 hover:bg-gray-50/50'
          }`}
        >
          <div className="flex items-center space-x-2 mb-2">
            <div className={`p-2 rounded-lg ${activeConcept === 'bucket' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Database size={16} />
            </div>
            <span className="font-bold text-xs text-gray-900">1. S3 Buckets</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            The fundamental data container. Think of it as an isolated digital locker or storage unit.
          </p>
        </button>

        {/* Concept 2 */}
        <button
          onClick={() => setActiveConcept('flat-key')}
          className={`p-4 rounded-xl text-left border transition cursor-pointer ${
            activeConcept === 'flat-key'
              ? 'bg-blue-50 border-blue-200 shadow-2xs'
              : 'bg-white border-gray-150 hover:bg-gray-50/50'
          }`}
        >
          <div className="flex items-center space-x-2 mb-2">
            <div className={`p-2 rounded-lg ${activeConcept === 'flat-key' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Layers size={16} />
            </div>
            <span className="font-bold text-xs text-gray-900">2. Flat Namespace</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Why folders don't actually exist in S3! How slash characters (<code className="font-mono text-gray-800 font-bold">/</code>) simulate directories.
          </p>
        </button>

        {/* Concept 3 */}
        <button
          onClick={() => setActiveConcept('presigned')}
          className={`p-4 rounded-xl text-left border transition cursor-pointer ${
            activeConcept === 'presigned'
              ? 'bg-blue-50 border-blue-200 shadow-2xs'
              : 'bg-white border-gray-150 hover:bg-gray-50/50'
          }`}
        >
          <div className="flex items-center space-x-2 mb-2">
            <div className={`p-2 rounded-lg ${activeConcept === 'presigned' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Link2 size={16} />
            </div>
            <span className="font-bold text-xs text-gray-900">3. Pre-signed URLs</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Self-destructing access passes. Generate secure sharing links that automatically lock as they expire.
          </p>
        </button>

        {/* Concept 4 */}
        <button
          onClick={() => setActiveConcept('lifecycle')}
          className={`p-4 rounded-xl text-left border transition cursor-pointer ${
            activeConcept === 'lifecycle'
              ? 'bg-blue-50 border-blue-200 shadow-2xs'
              : 'bg-white border-gray-150 hover:bg-gray-50/50'
          }`}
        >
          <div className="flex items-center space-x-2 mb-2">
            <div className={`p-2 rounded-lg ${activeConcept === 'lifecycle' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Clock size={16} />
            </div>
            <span className="font-bold text-xs text-gray-900">4. Lifecycle Rules</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Automatic cost reduction policies. Send old files into deep archive lockers or empty trash cans.
          </p>
        </button>
      </div>

      {/* Selected Concept Deep Dive */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs">
        {activeConcept === 'bucket' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <Database className="text-blue-600" size={18} />
                Understand S3 Buckets & Partitioning
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                In a standard PC, you save files onto local hard drive volumes (like C: or D:). In modern cloud environments, you host thousands of apps. To keep data safe and sorted, we bundle them in separate <span className="font-semibold text-gray-800">Buckets</span>.
              </p>
              <ul className="space-y-2.5 text-xs text-gray-500 pt-2">
                <li className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Global Name Uniqueness:</strong> Every bucket name must be unique globally. No two companies on earth can have a bucket named <code className="bg-gray-100 px-1 py-0.2 rounded font-mono text-[10px] text-gray-700">media-assets</code> at the same time.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Region Bound:</strong> Buckets are physically located in specific regions (like us-east-1). This simulator lets you provision local partitions in separate domain namespaces!</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Independent Rules:</strong> Each bucket can have its own access logs, lifecycles, and security restrictions.</span>
                </li>
              </ul>
            </div>
            <div className="bg-slate-50 rounded-xl p-5 border border-gray-150 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Interactive Bucket Analogy
                </span>
                <div className="space-y-4">
                  {/* Traditional PC file server */}
                  <div className="bg-white p-3 border border-gray-150 rounded-lg">
                    <p className="text-xs font-bold text-gray-700 mb-1">Standard OS Shared Network Drive</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      All departments write to a massive physical server folder. It gets bloated, permission management is a headache, and disks run out of space.
                    </p>
                  </div>
                  <div className="flex justify-center text-gray-300">
                    <ArrowRight className="rotate-90 lg:rotate-0" size={16} />
                  </div>
                  {/* Cloud Object storage */}
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                    <p className="text-xs font-bold text-blue-800 mb-1">Cloud Object Storage (S3 Buckets)</p>
                    <p className="text-[11px] text-blue-600 leading-relaxed">
                      The team provisions independent, API-driven buckets: <code className="font-mono bg-blue-100 text-blue-800 px-1 rounded text-[10px]">s3://accounting-invoices</code>, <code className="font-mono bg-blue-100 text-blue-800 px-1 rounded text-[10px]">s3://profile-avatars</code>. Completely isolated and secure.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 italic mt-4 text-center">
                Click "PUT Bucket" in the sidebar to create your own isolated storage partition in SQLite!
              </p>
            </div>
          </div>
        )}

        {activeConcept === 'flat-key' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <Layers className="text-indigo-600" size={18} />
                The S3 Secret: Slashed Object Keys (Flat Namespace)
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Here's a concept that surprises many beginner engineers: <span className="font-semibold text-gray-800">S3 doesn't have directories or folders.</span> 
                In a regular computer, folders are physical records in the storage block table. S3, however, is a **simple flat Key-Value database** (where the file name is the Key and the binary data is the Value).
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                To simulate folders, we just put slash characters (<code className="font-mono text-gray-800 font-bold bg-gray-100 px-1 rounded">/</code>) into the key. 
                Our web console parses these slashes dynamically and "folds" them into interactive directories!
              </p>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[11px] text-amber-800 leading-relaxed flex gap-2">
                <HelpCircle size={16} className="shrink-0 mt-0.5" />
                <p>
                  <strong>Why do cloud providers do this?</strong> Scaling a hierarchical folder database to trillions of files is extremely slow. Searching a flat database of indexed string keys is lightning-fast and infinite.
                </p>
              </div>
            </div>

            {/* Interactive Folder Simulation Tool */}
            <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Try the S3 Key Folder Simulator
                </span>
                <p className="text-[11px] text-slate-300">
                  Type a simulated nested path, click add, and see how S3 database flat rows translate to visual browser folders.
                </p>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="e.g. static/js/app.min.js"
                      className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-100"
                    />
                    <button
                      onClick={handleSimulateKey}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold font-mono shrink-0 cursor-pointer"
                    >
                      Store Key
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addPresetKeys}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300 font-semibold cursor-pointer"
                    >
                      + Load Preset Slashes
                    </button>
                    <button
                      onClick={clearSimulatedKeys}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-red-400 font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* DB Grid vs Visual Folder view */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                  {/* S3 database storage layout */}
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                      <Server size={10} />
                      Flat SQL Database Storage Rows
                    </p>
                    <div className="space-y-1 font-mono text-[9px] text-slate-300 max-h-36 overflow-y-auto">
                      {flatResult.length === 0 ? (
                        <p className="text-slate-500 italic">No flat keys loaded.</p>
                      ) : (
                        flatResult.map((key, idx) => (
                          <div key={idx} className="bg-slate-900 border border-slate-800 p-1 rounded truncate" title={key}>
                            <span className="text-blue-400">row #{idx+1}</span>: "{key}"
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Browser Folder view layout */}
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 flex flex-col justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                        <FolderOpen size={10} className="text-amber-400" />
                        Dynamic folded Visual Tree
                      </p>
                      <div className="space-y-1 font-mono text-[9px] text-slate-300 max-h-36 overflow-y-auto">
                        {flatResult.length === 0 ? (
                          <p className="text-slate-500 italic">Tree is empty.</p>
                        ) : (
                          // Build a tiny mock folder structure display
                          flatResult.map((key) => {
                            const parts = key.split('/');
                            return (
                              <div key={key} className="truncate">
                                {parts.map((p, pIdx) => {
                                  const isLast = pIdx === parts.length - 1;
                                  return (
                                    <span key={pIdx} className="text-[8px] font-mono block" style={{ paddingLeft: `${pIdx * 6}px` }}>
                                      {isLast ? `📄 ${p}` : `📁 ${p}/`}
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeConcept === 'presigned' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <Link2 className="text-blue-600" size={18} />
                Pre-signed URLs (Self-Destructing Gateway Access Passes)
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                By default, objects inside an S3 bucket are locked down secure. No one can download or read them over the web without permission.
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                What if your user wants to download their premium PDF invoice? You don't want to make your entire billing bucket public. Instead, your app server issues a temporary <span className="font-semibold text-gray-800">Pre-signed URL</span>. 
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                It's a special URL containing the file's path, an expiry timestamp, and a cryptographic signature verified by our database backend. When the timestamp expires, the signature fails validation and access is completely blocked!
              </p>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-800 leading-relaxed flex items-start gap-2">
                <Clock size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Real-World Case Study:</p>
                  <p className="text-blue-700 text-[11px] mt-0.5">
                    Streaming sites like Netflix do this for movie segments! Every movie video chunk is highly protected inside S3. Your player requests a chunk, is issued a 1-minute pre-signed link, downloads it, and the link self-destructs. No one can steal or leak the direct video file!
                  </p>
                </div>
              </div>
            </div>

            {/* Pre-signed URL generation flow interactive */}
            <div className="bg-slate-50 rounded-xl p-5 border border-gray-150 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Interactive Pre-signed Link Simulator
                </span>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Select File Key</label>
                      <select
                        value={simObjectName}
                        onChange={(e) => {
                          setSimObjectName(e.target.value);
                          setSimulatedToken('');
                        }}
                        className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white"
                      >
                        <option value="secret_blueprint.png">secret_blueprint.png</option>
                        <option value="confidential_reports.pdf">confidential_reports.pdf</option>
                        <option value="family_vacation_video.mp4">family_vacation_video.mp4</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Set Expiry Duration</label>
                      <select
                        value={simMinutes}
                        onChange={(e) => {
                          setSimMinutes(parseInt(e.target.value, 10));
                          setSimulatedToken('');
                        }}
                        className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white"
                      >
                        <option value={1}>1 Minute</option>
                        <option value={5}>5 Minutes</option>
                        <option value={60}>1 Hour</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSimulateSigning}
                    disabled={simulatingLink}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition shrink-0 cursor-pointer"
                  >
                    {simulatingLink ? 'Signing Object Key Cryptographically...' : 'Sign Temporary Access Token'}
                  </button>
                </div>

                {simulatedToken && (
                  <div className="space-y-2 pt-3 border-t border-gray-200 animate-in fade-in">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Cryptographic Secured Pre-signed Link</span>
                      <span className="text-[9px] font-semibold text-emerald-600 font-mono flex items-center gap-1 bg-emerald-50 px-1 rounded border border-emerald-100">
                        <Clock size={10} /> Link Active ({simMinutes}m)
                      </span>
                    </div>
                    <code className="text-[10px] font-mono bg-slate-900 text-slate-300 p-2 rounded-lg block break-all leading-relaxed max-h-24 overflow-y-auto border border-slate-950">
                      {simulatedToken}
                    </code>
                    <p className="text-[10px] text-gray-500 italic leading-relaxed">
                      This link can be shared with anyone in the world. They will be granted direct download rights from your container database without signing in, but once the deadline expires, the node server will block all traffic to this link!
                    </p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-400 text-center">
                Try clicking the blue <span className="font-semibold text-blue-600">Link Icon</span> on any uploaded object in the bucket console!
              </p>
            </div>
          </div>
        )}

        {activeConcept === 'lifecycle' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <Clock className="text-amber-600" size={18} />
                Object Lifecycle Policies: Automated Cost Reductions
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Hosting petabytes of data on fast solid-state drives is incredibly expensive. As database backups, diagnostic traces, and server logs age, their retrieval probability drops by 95% after 2 weeks.
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Object storage solves this by letting us define <span className="font-semibold text-gray-800">S3 Lifecycle Policies</span>. 
                Instead of developers manually deleting old files (which is risky and error-prone), an automatic software engine evaluates files every day and migrates them to cheaper storage classes!
              </p>
              
              <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-150 text-emerald-800">
                  <p className="font-bold text-[10px] uppercase text-emerald-900">S3 Standard</p>
                  <p className="text-[10px] text-emerald-600 mt-1">High-speed SSD. Immediate access. Perfect for active web content.</p>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-150 text-amber-800">
                  <p className="font-bold text-[10px] uppercase text-amber-900">S3 Glacier</p>
                  <p className="text-[10px] text-amber-600 mt-1">Simulated Archive. Cold tape storage. 80% cheaper, but requires restore time.</p>
                </div>
                <div className="p-2.5 bg-red-50 rounded-lg border border-red-150 text-red-800">
                  <p className="font-bold text-[10px] uppercase text-red-900">Expiration</p>
                  <p className="text-[10px] text-red-600 mt-1">Permanent purge. Deletes old backup files to save maximum disk space.</p>
                </div>
              </div>
            </div>

            {/* Interactive storage calculator slider */}
            <div className="bg-slate-50 rounded-xl p-5 border border-gray-150 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Interactive Storage Optimizer & Cost Calculator
                </span>
                <p className="text-[11px] text-gray-500">
                  Slide standard vs cold storage to see the direct financial impact of configuring lifecycle policies on massive data volumes.
                </p>

                {/* S3 data volume slider */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Total S3 Data Footprint:</span>
                    <span className="font-bold text-gray-900 font-mono">{(totalDataGB/1000).toFixed(1)} Terabytes ({totalDataGB.toLocaleString()} GB)</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="50000"
                    step="100"
                    value={totalDataGB}
                    onChange={(e) => setTotalDataGB(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Hot vs Cold slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Active (SSD Standard): <strong className="text-emerald-600">{hotRatio}%</strong></span>
                    <span>Archived (Glacier tape): <strong className="text-amber-600">{100-hotRatio}%</strong></span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={hotRatio}
                    onChange={(e) => setHotRatio(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Savings output display */}
                <div className="bg-slate-900 text-white p-3.5 rounded-lg border border-slate-950 grid grid-cols-2 gap-4 text-center mt-3">
                  <div className="border-r border-slate-800">
                    <p className="text-[9px] text-slate-400 uppercase">Monthly Hosting Cost</p>
                    <p className="text-lg font-black text-white font-mono flex items-center justify-center gap-0.5">
                      <DollarSign size={14} className="text-emerald-400" />
                      {currentTotalCost.toFixed(2)}
                    </p>
                    <p className="text-[8px] text-slate-500 mt-0.5">using custom lifecycle rules</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase text-emerald-400">Monthly Cost Savings</p>
                    <p className="text-lg font-black text-emerald-400 font-mono flex items-center justify-center gap-0.5">
                      <DollarSign size={14} />
                      {monthlySavings.toFixed(2)}
                    </p>
                    <p className="text-[8px] text-emerald-500 mt-0.5">85% cost reduction on cold storage</p>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 italic text-center">
                Configure your own automated rules in the <span className="font-semibold text-gray-600">"S3 Lifecycle Policies"</span> navigation tab!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Concept Comparison Grid */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <Layers size={16} className="text-blue-500" />
          S3 Cloud Storage vs. Local Filesystems
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Why does everyone use S3 instead of just standard file folders in modern container architecture? Here is a simple comparison:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-gray-100 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-700 font-bold">
                <th className="p-3">Core Capability</th>
                <th className="p-3">Local Physical Filesystem</th>
                <th className="p-3 text-blue-800 bg-blue-50/50">S3 Database-Backed Object Storage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-600">
              <tr>
                <td className="p-3 font-semibold text-gray-900">How folders are managed</td>
                <td className="p-3">Rigid physical hierarchical folders inside disk hardware structures.</td>
                <td className="p-3 bg-blue-50/10 text-gray-700 font-medium">Virtual paths generated on-the-fly by parsing string slashes in database key rows.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-gray-900">Attaching metadata/tags</td>
                <td className="p-3">Impossible. Files contain only raw binary data. Details are hidden.</td>
                <td className="p-3 bg-blue-50/10 text-gray-700 font-medium font-medium">Fully supported! Custom headers tag files, e.g. <code className="font-mono text-[10px] text-slate-700 bg-slate-100 px-1 rounded">meta-Owner=Surjit</code>.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-gray-900">Sharing files securely</td>
                <td className="p-3">Requires uploading to email or creating custom server endpoints.</td>
                <td className="p-3 bg-blue-50/10 text-gray-700 font-medium">Simple Pre-signed links. Anyone can download securely with a self-destruct countdown signature.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-gray-900">Spring-cleaning old files</td>
                <td className="p-3">Requires cron servers running risky bash/python manual delete scripts.</td>
                <td className="p-3 bg-blue-50/10 text-gray-700 font-medium">Completely hands-off. Define S3 lifecycle policy metadata and the SQL engine automates the rest.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
