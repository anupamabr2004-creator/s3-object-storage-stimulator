# Dockerized S3 Object Storage Simulator

A lightweight, self-contained, and highly educational **S3-inspired Object Storage Simulator** and conceptual playground. Built with a full-stack architecture using **Node.js**, **Vite / React (TypeScript)**, **SQLite**, and **Docker**, it provides a local, zero-cost, and visually intuitive console for simulating production cloud storage operations.

---

## 🎯 What is the Use Case? Why Use This?

In modern cloud computing, **Object Storage** (like AWS S3, Google Cloud Storage, or Azure Blob Storage) is the gold standard for hosting files. However, cloud systems present significant barriers to entry for beginners, students, and offline developers:

1. **Financial Risk & Credit Card Barriers:** Cloud accounts require credit cards. Small mistakes—like leaving storage buckets public or configuring incorrect automated scripts—can lead to thousands of dollars in unexpected cloud bills.
2. **The "Black Box" Problem:** Traditional cloud providers hide their indexing and relational engines under a proprietary API. It is hard to "see" how flat key-value pairs, tags, and lifecycle transitions work behind the scenes.
3. **Heavy Dev Environments:** While tools like MinIO or LocalStack are excellent, they are resource-heavy, require complex configuration, and lack a visual, beginner-friendly educational interface explaining the core pillars of object storage.

### 🌟 The Solution: This Simulator
This project acts as an **interactive offline laboratory and local dev-server**. It replicates the complete visual lifecycle of S3 console operations, backed by a relational database engine, and explains *exactly* how the cloud manages files under the hood.

---

## 🚀 Key Features

### 1. Interactive S3 Concept Sandbox
An interactive learning dashboard designed to make cloud storage concepts approachable for everyone:
* **The S3 Bucket Model:** Understand global name uniqueness and region partitioning.
* **The S3 Secret (Flat Namespace):** Visually see why "folders" don't actually exist in cloud object storage, and how slash characters (`/`) in flat string keys are mapped into virtual visual directories.
* **Pre-signed URL Generator:** Experience how Netflix or secure sites stream private content. Generate temporary download tokens with custom expiration countdowns that self-destruct.
* **Lifecycle Optimizer & Cost Calculator:** Adjust storage footprint slides to visually calculate the massive financial savings of archiving inactive files using lifecycle rules.

### 2. Fully-Featured S3 Control Console
* **PUT/DELETE Buckets:** Provision independent, isolated logical partitions in separate region domains.
* **Interactive File Explorer (VFold):** Upload files of any format, navigate simulated directories with path folding, and preview metadata instantly.
* **Custom User Metadata Tags:** Attach standard key-value headers (e.g., `X-Amz-Meta-Owner = DevUser`) directly onto records in our relational database.
* **Secure Expiry Tokens:** Generate real, functional download links signed with cryptographic signatures that expire automatically.

### 3. Automated S3 Lifecycle Policies
* Define transition rules for specific file prefixes.
* Automate the shift of cold data from **Standard SSD** to **Glacier Tape Archive** (simulating massive cost savings) or schedule permanent deletions of temporary database dumps and logs.
* Monitor live transition counts and storage statistics on the interactive chart.

### 4. Full-Stack Developer Architecture
* **Frontend:** Responsive layout styled with Tailwind CSS, leveraging dynamic animations and real-time interactive charts built with Recharts.
* **Backend:** Scalable Express.js API server running on Node.js.
* **Relational Core:** Hand-crafted SQLite schema designed to illustrate relational indexing of binary objects and metadata mapping.
* **Container Ready:** Bundled with an optimized `Dockerfile` and `docker-compose.yml` for single-command orchestration.

---

## 🛠️ System Architecture & Schema

Traditional filesystems map directory nodes on disk. This simulator models object storage the **correct cloud way**—using a highly performant **Relational Index Database** mapped to a flat binary storage volume:

```
                  ┌──────────────────────────────────────────────┐
                  │                 Vite React UI                │
                  │             (S3 Control Console)             │
                  └──────────────────────┬───────────────────────┘
                                         │ REST API
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │               Express Server                 │
                  └──────────────────────┬───────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │    SQLite Metadata DB     │                   │     Local disk volume     │
   ├───────────────────────────┤                   ├───────────────────────────┤
   │ * Buckets Registry        │                   │ Actual binary payloads    │
   │ * Flat Key-Value Indexes  │                   │ structured by Bucket UUID │
   │ * Custom Tag Metadata     │                   │ on the host system        │
   │ * S3 Lifecycle Rules      │                   │                           │
   └───────────────────────────┘                   └───────────────────────────┘
```

---

## ⚙️ Local Setup Instructions

You can run this application locally either via standard Node.js scripts or inside an isolated container with Docker Compose.

### Option A: Standard Node.js Setup

#### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** or **bun** / **yarn**

#### 1. Clone & Extract
```bash
git clone <repository-url>
cd s3-object-storage-simulator
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Start the Development Server
This runs the full-stack system in development mode. Vite compiles assets, and the hot-reload server binds to port `3000`.
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### 4. Build for Production
Compiles client-side React files into `dist/` and bundles the TypeScript Express server.
```bash
npm run build
npm start
```

---

### Option B: Docker Container Orchestration (Recommended)

Docker isolates the simulator completely, preserving database records and bucket binaries inside an external storage volume directory.

#### Prerequisites
* **Docker Desktop** installed and running.

#### 1. Spin up the Container Structure
Navigate to the root directory containing the `docker-compose.yml` file and run:
```bash
docker compose up -d --build
```

#### 2. Verify Container Execution
Check running containers and view server startup logs:
```bash
docker compose ps
docker compose logs -f
```

#### 3. Stop Environment
```bash
docker compose down
```

---

## 📂 Project Structure

```
├── data/                    # Persistent storage volume (SQLite DB & physical bucket files)
├── src/
│   ├── components/
│   │   ├── S3Playground.tsx      # Educational interactive sandbox (Intro, Flat Keys, Pre-signed URL)
│   │   ├── AnalyticsDashboard.tsx # Storage stats, pie charts, and real-time event logging
│   │   ├── BucketExplorer.tsx     # Replicated AWS Console (Directory tree, path-folding, uploads, tags)
│   │   └── LifecycleManager.tsx   # Automated policy setup forms
│   ├── App.tsx              # Core app navigation routing
│   ├── main.tsx             # Frontend React entry point
│   └── types.ts             # Global TypeScript interface definitions
├── server.ts                # Express backend proxy routing API and cryptographic engines
├── Dockerfile               # Production container build directives
├── docker-compose.yml       # Production volume mounting configuration
├── vite.config.ts           # Bundler config
└── package.json             # Environment package declarations
```

---

## 🛡️ License

This project is open-source and available under the **MIT License**. Feel free to use, modify, and distribute it for educational workshops, dev-testing, or as a visual asset in your software development portfolio.
