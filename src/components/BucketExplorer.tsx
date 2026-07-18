import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  File, 
  FileText, 
  Image, 
  Code, 
  Archive, 
  Download, 
  Trash2, 
  Link2, 
  Plus, 
  ChevronRight, 
  Upload, 
  FolderPlus, 
  Tag, 
  X, 
  Copy, 
  Check, 
  Info, 
  Eye, 
  RefreshCw 
} from 'lucide-react';
import { Bucket, S3Object, ObjectMetadata } from '../types';
import { formatBytes } from './AnalyticsDashboard';

interface BucketExplorerProps {
  bucket: Bucket;
  onObjectChange: () => void;
}

export const BucketExplorer: React.FC<BucketExplorerProps> = ({ bucket, onObjectChange }) => {
  const [allObjects, setAllObjects] = useState<S3Object[]>([]);
  const [prefix, setPrefix] = useState<string>(''); // Current virtual directory path (e.g. "images/")
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Upload fields
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPrefix, setUploadPrefix] = useState(''); // Target directory to upload into
  const [customMetadata, setCustomMetadata] = useState<{ key: string; value: string }[]>([
    { key: 'Owner', value: 'Surjit' }
  ]);

  // Share Link Modal state
  const [sharingObject, setSharingObject] = useState<S3Object | null>(null);
  const [linkExpiry, setLinkExpiry] = useState('60'); // Minutes
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Metadata Modal state
  const [metadataObject, setMetadataObject] = useState<S3Object | null>(null);
  const [objectMetaList, setObjectMetaList] = useState<ObjectMetadata[]>([]);
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newMetaValue, setNewMetaValue] = useState('');

  // Drag and drop focus
  const [dragActive, setDragActive] = useState(false);

  // Fetch objects in bucket
  const fetchObjects = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/s3/buckets/${bucket.name}/objects`);
      if (response.ok) {
        const data = await response.json();
        setAllObjects(data);
      }
    } catch (e) {
      console.error('Failed to load objects', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjects();
    setPrefix(''); // reset prefix on bucket change
  }, [bucket.name]);

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Upload Object handler
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    // Compute S3-style Key. If prefix is provided, join it nicely.
    let fullKey = selectedFile.name;
    if (uploadPrefix.trim()) {
      let formattedPrefix = uploadPrefix.trim();
      if (!formattedPrefix.endsWith('/')) {
        formattedPrefix += '/';
      }
      fullKey = formattedPrefix + selectedFile.name;
    }
    formData.append('key', fullKey);

    // Pack metadata
    const metadataObj: Record<string, string> = {};
    customMetadata.forEach(tag => {
      if (tag.key.trim() && tag.value.trim()) {
        metadataObj[tag.key.trim()] = tag.value.trim();
      }
    });
    formData.append('metadata', JSON.stringify(metadataObj));

    try {
      const response = await fetch(`/api/s3/buckets/${bucket.name}/objects`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setSelectedFile(null);
        setUploadPrefix('');
        // Keep "Owner" tag as default, clear others
        setCustomMetadata([{ key: 'Owner', value: 'Surjit' }]);
        fetchObjects();
        onObjectChange();
      } else {
        const err = await response.json();
        alert(`Upload failed: ${err.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Upload request failed', err);
    } finally {
      setUploadLoading(false);
    }
  };

  // Delete Object handler
  const handleDeleteObject = async (objectId: number) => {
    if (!confirm('Are you sure you want to permanently delete this object from S3 storage?')) return;
    try {
      const response = await fetch(`/api/s3/buckets/${bucket.name}/objects/${objectId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchObjects();
        onObjectChange();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // S3 Glacier Restore trigger
  const handleRestoreObject = async (objectId: number) => {
    try {
      const response = await fetch(`/api/s3/buckets/${bucket.name}/objects/${objectId}/restore`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchObjects();
        onObjectChange();
        alert('Object restore triggered successfully! Status reverted to ACTIVE.');
      } else {
        const err = await response.json();
        alert(err.message || 'Could not restore object.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Pre-signed Expiring Link trigger
  const handleGenerateShareLink = async () => {
    if (!sharingObject) return;
    try {
      const response = await fetch(`/api/s3/objects/${sharingObject.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInMinutes: linkExpiry }),
      });
      if (response.ok) {
        const data = await response.json();
        setGeneratedLink(data.share_link);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Manage metadata modal handlers
  const openMetadataModal = async (obj: S3Object) => {
    setMetadataObject(obj);
    try {
      const res = await fetch(`/api/s3/objects/${obj.id}/metadata`);
      if (res.ok) {
        const data = await res.json();
        setObjectMetaList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMetadataItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metadataObject || !newMetaKey.trim() || !newMetaValue.trim()) return;

    try {
      const res = await fetch(`/api/s3/objects/${metadataObject.id}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newMetaKey.trim(), value: newMetaValue.trim() }),
      });
      if (res.ok) {
        // Reload metadata list
        const updatedRes = await fetch(`/api/s3/objects/${metadataObject.id}/metadata`);
        const updatedData = await updatedRes.json();
        setObjectMetaList(updatedData);
        setNewMetaKey('');
        setNewMetaValue('');
        onObjectChange(); // Refresh log timeline
      }
    } catch (e) {
      console.error(e);
    }
  };

  // File MIME Type icon selector
  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <Image className="text-emerald-500 shrink-0" size={18} />;
    if (mime.startsWith('text/')) return <FileText className="text-blue-500 shrink-0" size={18} />;
    if (mime.includes('javascript') || mime.includes('json') || mime.includes('sql') || mime.includes('html') || mime.includes('css')) return <Code className="text-purple-500 shrink-0" size={18} />;
    return <File className="text-gray-400 shrink-0" size={18} />;
  };

  // -------------------------------------------------------------
  // S3 Key prefix simulation / folding logic
  // -------------------------------------------------------------
  const displayedFolders = new Set<string>();
  const displayedObjects: S3Object[] = [];

  allObjects.forEach((obj) => {
    if (obj.key.startsWith(prefix)) {
      const relativePart = obj.key.substring(prefix.length);
      if (relativePart.includes('/')) {
        const subfolder = relativePart.split('/')[0];
        displayedFolders.add(prefix + subfolder + '/');
      } else if (relativePart.length > 0) {
        displayedObjects.push(obj);
      }
    }
  });

  const sortedFolders = Array.from(displayedFolders).sort();

  // Helper to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Breadcrumbs navigation builder
  const renderBreadcrumbs = () => {
    const parts = prefix.split('/').filter(Boolean);
    return (
      <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-mono mb-4 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
        <button 
          onClick={() => setPrefix('')} 
          className="hover:text-blue-600 font-semibold hover:underline cursor-pointer"
        >
          s3://{bucket.name}
        </button>
        {parts.map((p, index) => {
          const currentPath = parts.slice(0, index + 1).join('/') + '/';
          return (
            <React.Fragment key={index}>
              <ChevronRight size={12} className="text-gray-400" />
              <button 
                onClick={() => setPrefix(currentPath)} 
                className="hover:text-blue-600 hover:underline max-w-[120px] truncate cursor-pointer"
              >
                {p}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Bucket Overview Card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold px-2 py-0.5 rounded-full font-mono uppercase">
            {bucket.region}
          </span>
          <h2 className="text-lg font-bold text-gray-900 mt-1 font-mono">
            s3://{bucket.name}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Created: {new Date(bucket.created_at).toLocaleString()} • Space occupied: <span className="font-semibold text-gray-700">{formatBytes(bucket.total_size)}</span>
          </p>
        </div>
        
        <button 
          onClick={fetchObjects}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-200 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Sync S3 Key Records
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* S3 Object Storage Explorer Table (Col Span 2) */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xs xl:col-span-2 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Object Records
            </h3>
            <span className="text-[10px] font-semibold text-gray-500 font-mono bg-white border border-gray-100 px-2 py-0.5 rounded-md shadow-2xs">
              {allObjects.length} Objects Total
            </span>
          </div>

          <div className="p-4">
            {/* Breadcrumb pathing */}
            {renderBreadcrumbs()}

            {/* Object Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-semibold bg-gray-50">
                    <th className="p-2.5">Name / Object Key</th>
                    <th className="p-2.5 text-right">Size</th>
                    <th className="p-2.5">MIME Type</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium">
                  {/* Parent Folder navigation */}
                  {prefix !== '' && (
                    <tr 
                      onClick={() => {
                        const folders = prefix.split('/').filter(Boolean);
                        folders.pop();
                        setPrefix(folders.length > 0 ? folders.join('/') + '/' : '');
                      }}
                      className="hover:bg-blue-50/30 cursor-pointer text-blue-600 transition"
                    >
                      <td className="p-2.5 font-mono flex items-center space-x-2">
                        <Folder className="text-blue-500 fill-blue-50 shrink-0" size={18} />
                        <span>.. (parent directory)</span>
                      </td>
                      <td className="p-2.5 text-right">-</td>
                      <td className="p-2.5">-</td>
                      <td className="p-2.5 text-center">-</td>
                      <td className="p-2.5 text-right"></td>
                    </tr>
                  )}

                  {/* Render simulated Folders */}
                  {sortedFolders.map((fPrefix) => {
                    const folderName = fPrefix.substring(prefix.length);
                    return (
                      <tr 
                        key={fPrefix}
                        onClick={() => setPrefix(fPrefix)}
                        className="hover:bg-gray-50 cursor-pointer text-gray-700 transition"
                      >
                        <td className="p-2.5 font-mono flex items-center space-x-2">
                          <Folder className="text-amber-400 fill-amber-50 shrink-0" size={18} />
                          <span className="font-semibold text-gray-800">{folderName}</span>
                        </td>
                        <td className="p-2.5 text-right text-gray-400">-</td>
                        <td className="p-2.5 text-gray-400">Virtual Directory</td>
                        <td className="p-2.5 text-center">-</td>
                        <td className="p-2.5 text-right"></td>
                      </tr>
                    );
                  })}

                  {/* Render objects inside this virtual folder */}
                  {displayedObjects.length === 0 && sortedFolders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-gray-400 italic">
                        This virtual directory is empty. Try dragging & dropping files on the right!
                      </td>
                    </tr>
                  ) : (
                    displayedObjects.map((obj) => (
                      <tr key={obj.id} className="hover:bg-gray-50/80 transition">
                        {/* Key Name */}
                        <td className="p-2.5 font-mono text-gray-800 max-w-[200px] truncate" title={obj.key}>
                          <div className="flex items-center space-x-2">
                            {getFileIcon(obj.mime_type)}
                            <span>{obj.key.substring(prefix.length)}</span>
                          </div>
                        </td>

                        {/* Size */}
                        <td className="p-2.5 text-right font-mono text-gray-600 whitespace-nowrap">
                          {formatBytes(obj.size)}
                        </td>

                        {/* MIME Type */}
                        <td className="p-2.5 text-gray-500 font-mono text-[10px] truncate max-w-[120px]" title={obj.mime_type}>
                          {obj.mime_type}
                        </td>

                        {/* S3 Glacier Status Badge */}
                        <td className="p-2.5 text-center">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                            obj.lifecycle_status === 'active' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                              : 'bg-amber-50 text-amber-700 border-amber-150'
                          }`}>
                            {obj.lifecycle_status === 'active' ? 'Active' : 'Archived (Glacier)'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Metadata Custom Headers Viewer */}
                            <button
                              onClick={() => openMetadataModal(obj)}
                              title="S3 S3 HTTP Metadata Tags"
                              className="p-1 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer"
                            >
                              <Tag size={13} />
                            </button>

                            {/* Share Expiring pre-signed link */}
                            {obj.lifecycle_status === 'active' && (
                              <button
                                onClick={() => {
                                  setSharingObject(obj);
                                  setGeneratedLink('');
                                }}
                                title="Generate Expiring Access Link (Pre-signed URL)"
                                className="p-1 bg-blue-50 border border-blue-150 hover:bg-blue-100 rounded text-blue-600 transition cursor-pointer"
                              >
                                <Link2 size={13} />
                              </button>
                            )}

                            {/* Restore from Glacier archive */}
                            {obj.lifecycle_status === 'archived' && (
                              <button
                                onClick={() => handleRestoreObject(obj.id)}
                                title="Initiate simulated S3 Glacier Restore transition"
                                className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 rounded font-semibold text-[10px] transition cursor-pointer"
                              >
                                Restore
                              </button>
                            )}

                            {/* Download */}
                            {obj.lifecycle_status === 'active' && (
                              <a
                                href={`/api/s3/buckets/${bucket.name}/objects/${obj.id}/download`}
                                download={obj.filename}
                                title="Download object"
                                className="p-1 bg-emerald-50 border border-emerald-150 hover:bg-emerald-100 rounded text-emerald-600 transition flex items-center justify-center cursor-pointer"
                              >
                                <Download size={13} />
                              </a>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteObject(obj.id)}
                              title="Delete Object"
                              className="p-1 bg-red-50 border border-red-150 hover:bg-red-100 rounded text-red-600 transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* S3 File Upload Pane (Right Grid) */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
            <Upload className="text-emerald-500 w-4.5 h-4.5" />
            S3 Object Multipart PUT
          </h3>

          <form onSubmit={handleUpload} className="space-y-4">
            {/* Drag & Drop Canvas */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition relative ${
                dragActive ? 'border-blue-500 bg-blue-50/20' : 'border-gray-200 bg-gray-50 hover:bg-gray-100/50'
              }`}
            >
              <input
                type="file"
                id="file-selector"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <label htmlFor="file-selector" className="cursor-pointer block">
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                {selectedFile ? (
                  <div className="text-xs">
                    <p className="font-semibold text-gray-800 truncate max-w-[200px] mx-auto">{selectedFile.name}</p>
                    <p className="text-gray-400 mt-0.5 font-mono">{formatBytes(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div className="text-xs">
                    <p className="font-semibold text-gray-700">Drag & drop files here, or <span className="text-blue-600 underline">browse</span></p>
                    <p className="text-gray-400 mt-1">Accepts images, code, plain-text logs, backups, and archives</p>
                  </div>
                )}
              </label>
            </div>

            {/* Custom S3 Prefix Folder nesting */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Simulated Folder Path Prefix (Key Prefix)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-gray-400 select-none">s3://{bucket.name}/</span>
                <input
                  type="text"
                  placeholder="e.g. static/assets/"
                  value={uploadPrefix}
                  onChange={(e) => setUploadPrefix(e.target.value)}
                  className="w-full text-xs font-mono border border-gray-200 rounded-lg py-2 pr-2.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                  style={{ paddingLeft: `calc(${bucket.name.length}ch + 9ch)` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 italic">Prepend a directory path prefix to simulate bucket folders</p>
            </div>

            {/* Dynamic Metadata Headers Builder (S3 HTTP Metadata) */}
            <div className="space-y-2 pt-2 border-t border-gray-150">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  S3 HTTP Metadata Headers (x-amz-meta-*)
                </label>
                <button
                  type="button"
                  onClick={() => setCustomMetadata([...customMetadata, { key: '', value: '' }])}
                  className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                >
                  <Plus size={10} /> Add Tag
                </button>
              </div>

              {customMetadata.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic">No custom metadata headers. Click Add Tag to configure.</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {customMetadata.map((tag, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-gray-400">meta-</span>
                      <input
                        type="text"
                        placeholder="Key"
                        value={tag.key}
                        onChange={(e) => {
                          const updated = [...customMetadata];
                          updated[idx].key = e.target.value;
                          setCustomMetadata(updated);
                        }}
                        className="w-1/2 text-xs font-mono border border-gray-200 rounded-md p-1 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={tag.value}
                        onChange={(e) => {
                          const updated = [...customMetadata];
                          updated[idx].value = e.target.value;
                          setCustomMetadata(updated);
                        }}
                        className="w-1/2 text-xs font-mono border border-gray-200 rounded-md p-1 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = customMetadata.filter((_, i) => i !== idx);
                          setCustomMetadata(updated);
                        }}
                        className="text-red-500 hover:text-red-700 shrink-0 p-1 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit PUT object */}
            <button
              type="submit"
              disabled={uploadLoading || !selectedFile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-lg transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload size={14} />
              {uploadLoading ? 'Uploading Object...' : 'PUT Object to s3://' + bucket.name}
            </button>
          </form>
        </div>
      </div>

      {/* Sharing link modal overlay */}
      {sharingObject && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-5 shadow-xl relative animate-in fade-in zoom-in duration-150">
            <button 
              onClick={() => setSharingObject(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-2">
              <Link2 className="text-blue-500" size={18} />
              Generate Temporary S3 Shared Link
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Simulates a secure <span className="font-semibold text-gray-700">S3 Pre-signed Download URL</span> that completely invalidates and locks automatically after expiration.
            </p>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Target Object Key</span>
                <code className="text-xs font-mono bg-gray-50 border border-gray-100 p-2 rounded-lg block truncate text-gray-700">
                  {sharingObject.key}
                </code>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Link Expiration Limit
                </label>
                <select
                  value={linkExpiry}
                  onChange={(e) => setLinkExpiry(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white"
                >
                  <option value="1">1 Minute (For testing expiry! ⏳)</option>
                  <option value="5">5 Minutes</option>
                  <option value="60">1 Hour (60 Minutes)</option>
                  <option value="1440">1 Day (1440 Minutes)</option>
                </select>
              </div>

              <button
                onClick={handleGenerateShareLink}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-lg transition cursor-pointer"
              >
                Sign Temporary URL Key
              </button>

              {generatedLink && (
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Signed Pre-signed URL</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="w-full text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-600 truncate focus:outline-hidden"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedLink)}
                      className="p-2 border border-gray-200 bg-white rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition cursor-pointer"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="text-emerald-500" size={14} /> : <Copy size={14} />}
                    </button>
                    <a
                      href={generatedLink}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 border border-blue-200 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                      title="Test URL in new tab"
                    >
                      <Eye size={14} />
                    </a>
                  </div>
                  {copied && <p className="text-[10px] text-emerald-600 font-semibold text-right">Link copied to clipboard!</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Metadata headers inspector modal overlay */}
      {metadataObject && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-5 shadow-xl relative animate-in fade-in zoom-in duration-150">
            <button 
              onClick={() => setMetadataObject(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-2">
              <Tag className="text-purple-500" size={18} />
              S3 Custom HTTP Headers Metadata
            </h3>
            <p className="text-xs text-gray-500 mb-4 font-mono truncate">
              object: {metadataObject.key}
            </p>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5">Registered Metadata Tags</span>
                {objectMetaList.length === 0 ? (
                  <p className="text-xs text-gray-400 italic bg-gray-50 border border-gray-100 rounded-lg p-3 text-center">
                    No custom user headers bound to this key. S3 metadata can be added below.
                  </p>
                ) : (
                  <div className="border border-gray-100 rounded-lg overflow-hidden divide-y divide-gray-50 max-h-48 overflow-y-auto">
                    {objectMetaList.map((m) => (
                      <div key={m.meta_key} className="flex justify-between items-center p-2 text-xs hover:bg-gray-50 transition">
                        <span className="font-mono font-semibold text-gray-600">{m.meta_key}</span>
                        <span className="font-mono text-gray-500 truncate max-w-[180px]" title={m.meta_value}>{m.meta_value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add tags builder */}
              <form onSubmit={handleAddMetadataItem} className="pt-3 border-t border-gray-100 space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">PUT Metadata Tag</span>
                <div className="flex gap-2">
                  <div className="relative w-1/2">
                    <span className="absolute left-2 top-2 text-[10px] font-mono text-gray-400">meta-</span>
                    <input
                      type="text"
                      required
                      placeholder="TagKey"
                      value={newMetaKey}
                      onChange={(e) => setNewMetaKey(e.target.value)}
                      className="w-full text-xs font-mono border border-gray-200 rounded-lg py-1.5 pr-2 pl-9 bg-white"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="TagValue"
                    value={newMetaValue}
                    onChange={(e) => setNewMetaValue(e.target.value)}
                    className="w-1/2 text-xs font-mono border border-gray-200 rounded-lg p-1.5 bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-lg transition cursor-pointer"
                >
                  Write HTTP Header
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
