export interface Bucket {
  id: number;
  name: string;
  region: string;
  created_at: string;
  object_count: number;
  total_size: number;
}

export interface S3Object {
  id: number;
  bucket_id: number;
  key: string;
  filename: string;
  size: number;
  mime_type: string;
  storage_path: string;
  md5_etag: string;
  lifecycle_status: 'active' | 'archived' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface ObjectMetadata {
  meta_key: string;
  meta_value: string;
}

export interface TemporaryLink {
  token: string;
  expires_at: string;
  share_link: string;
  expires_in_minutes: number;
}

export interface LifecyclePolicy {
  id: number;
  bucket_id: number;
  prefix: string | null;
  days_to_archive: number | null;
  days_to_delete: number | null;
  created_at: string;
}

export interface StorageLog {
  id: number;
  event_type: 'upload' | 'download' | 'delete' | 'link_create' | 'link_access' | 'lifecycle' | 'bucket_create' | 'bucket_delete' | 'lifecycle_policy_add' | 'metadata_update';
  bucket_id: number | null;
  bucket_name: string | null;
  object_id: number | null;
  object_key: string | null;
  details: string;
  timestamp: string;
}

export interface StorageAnalytics {
  stats: {
    bucketsCount: number;
    objectsCount: number;
    totalSize: number;
    activeLinksCount: number;
    totalDownloads: number;
  };
  bucketDistribution: {
    name: string;
    objectCount: number;
    totalBytes: number;
  }[];
  mimeDistribution: {
    mimeType: string;
    count: number;
    totalBytes: number;
  }[];
  recentLogs: StorageLog[];
  storageTrend: {
    date: string;
    uploadCount: number;
    bytesAdded: number;
  }[];
}
