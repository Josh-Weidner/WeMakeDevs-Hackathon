export type Level = "beginner" | "intermediate" | "advanced";

export interface TalkSeed {
  title: string;
  hook: string;
  tags: string[];
  level: Level;
  vendor?: boolean;
  format?: "keynote" | "talk" | "panel" | "workshop" | "lightning";
  /** Pin to a specific slot (0-based, day-major) and room id for demo-critical talks. */
  pin?: { slot: number; room: string };
}

/** One sentence per tag; abstracts are composed from these plus the talk's own hook. */
export const TAG_BLURBS: Record<string, string> = {
  "multi-tenancy": "We cover how teams share a cluster safely with namespaces, quotas, and clear tenant boundaries.",
  ebpf: "eBPF lets you observe and enforce behavior in the kernel without changing application code.",
  "bare-metal": "Running Kubernetes on bare metal means owning provisioning, networking, and hardware failure yourself.",
  observability: "Good observability turns a vague 'it feels slow' into a specific, explainable cause.",
  opentelemetry: "OpenTelemetry gives traces, metrics, and logs one vendor-neutral way to leave your services.",
  "platform-engineering": "A platform team succeeds when developers get a paved road instead of a ticket queue.",
  security: "Defense in depth means assuming one layer will fail and making sure the next one holds.",
  "supply-chain": "Signing, provenance, and SBOMs make it possible to trust what actually runs in production.",
  gitops: "GitOps makes the repository the source of truth, so every change is reviewed and reversible.",
  networking: "Cluster networking decides latency, blast radius, and how painful debugging will be.",
  "service-mesh": "A service mesh moves retries, mTLS, and traffic shaping out of application code.",
  scheduling: "The scheduler is a policy engine: bin packing, priorities, and fairness all live there.",
  autoscaling: "Autoscaling only helps if it reacts to the signal that actually predicts load.",
  gpu: "GPUs are scarce and expensive, so sharing and scheduling them well pays off quickly.",
  "ai-ml": "Production machine learning is mostly plumbing: data, serving, evaluation, and rollbacks.",
  storage: "Stateful workloads need storage that survives rescheduling without surprising you.",
  cost: "Cost visibility changes behavior once every team can see what their workloads spend.",
  reliability: "Reliability is a feature you budget for with SLOs, not a goal you wish into existence.",
  sre: "SRE practice turns incidents into durable fixes instead of repeating stories.",
  "incident-response": "Calm, rehearsed incident response shortens outages more than any single tool does.",
  databases: "Running databases on Kubernetes works when you respect failure domains and backups.",
  wasm: "WebAssembly offers small, fast, sandboxed workloads that start in milliseconds.",
  edge: "Edge clusters run with flaky links and tiny machines, so everything must degrade gracefully.",
  policy: "Policy as code lets you enforce rules at admission time instead of finding drift later.",
  accessibility: "Accessible tools and talks widen who can participate in cloud native work.",
  devex: "Developer experience is the sum of every small delay between an idea and a running change.",
};

export const CLOSERS: Record<Level, string> = {
  beginner: "No prior experience needed: we start from the basics and end with something you can try today.",
  intermediate: "You should be comfortable running Kubernetes already; we focus on trade-offs and real configs.",
  advanced: "Expect deep dives, failure stories, and numbers from production systems.",
};

export const TRACK_BY_TAG: Record<string, string> = {
  "multi-tenancy": "Platform",
  "platform-engineering": "Platform",
  gitops: "Platform",
  devex: "Platform",
  cost: "Platform",
  ebpf: "Networking",
  networking: "Networking",
  "service-mesh": "Networking",
  edge: "Networking",
  "bare-metal": "Infrastructure",
  storage: "Infrastructure",
  databases: "Infrastructure",
  scheduling: "Infrastructure",
  autoscaling: "Infrastructure",
  observability: "Observability",
  opentelemetry: "Observability",
  reliability: "Reliability",
  sre: "Reliability",
  "incident-response": "Reliability",
  security: "Security",
  "supply-chain": "Security",
  policy: "Security",
  gpu: "AI & Data",
  "ai-ml": "AI & Data",
  wasm: "Emerging",
  accessibility: "Community",
};

export const KEYNOTES: TalkSeed[] = [
  {
    title: "Keynote: The Next Decade of Cloud Native",
    hook: "Where the ecosystem is heading and what to bet on.",
    tags: ["platform-engineering", "reliability"],
    level: "beginner",
    format: "keynote",
  },
  {
    title: "Keynote: Operating AI Workloads at Scale",
    hook: "What changes when your workloads need accelerators and evaluation loops.",
    tags: ["ai-ml", "gpu"],
    level: "intermediate",
    format: "keynote",
  },
];

export const TALKS: TalkSeed[] = [
  // Multi-tenancy cluster (demo: "beginner talks on multi-tenancy, nothing vendor-pitchy")
  { title: "Multi-Tenancy 101: Namespaces, Quotas, and Boundaries", hook: "A guided tour of the building blocks for sharing one cluster.", tags: ["multi-tenancy", "security"], level: "beginner", pin: { slot: 2, room: "room-4" } },
  { title: "Sharing a Cluster Without Sharing Problems", hook: "How a small platform team onboarded twenty tenants in a quarter.", tags: ["multi-tenancy", "platform-engineering"], level: "beginner" },
  { title: "Why NimbusCloud Tenancy Beats Everything Else", hook: "A product tour of our managed multi-tenant control plane.", tags: ["multi-tenancy"], level: "beginner", vendor: true },
  { title: "Hard Multi-Tenancy with Virtual Clusters", hook: "When namespaces are not isolation enough.", tags: ["multi-tenancy", "security"], level: "intermediate" },
  { title: "Noisy Neighbors: Fair Scheduling Across Tenants", hook: "Quotas, priorities, and preemption under real contention.", tags: ["multi-tenancy", "scheduling"], level: "advanced" },
  // eBPF cluster (demo: "the person I met at the eBPF talk")
  { title: "eBPF in Production: What We Learned the Hard Way", hook: "Rolling out kernel-level observability across a fleet.", tags: ["ebpf", "observability"], level: "intermediate" },
  { title: "Getting Started with eBPF Observability", hook: "Your first useful probes without writing C.", tags: ["ebpf", "observability"], level: "beginner" },
  { title: "Sidecar-Free Networking with eBPF", hook: "Replacing proxies with kernel datapaths, and what breaks.", tags: ["ebpf", "networking"], level: "advanced" },
  { title: "Runtime Security with eBPF: Detecting the Weird", hook: "Building detections that your SOC will actually trust.", tags: ["ebpf", "security"], level: "intermediate" },
  // Bare-metal cluster (demo: "3 people who run K8s in prod on bare metal")
  { title: "Kubernetes on Bare Metal: Lessons from 500 Nodes", hook: "Provisioning, networking, and failure at hardware scale.", tags: ["bare-metal", "networking"], level: "intermediate" },
  { title: "PXE to Production: Provisioning Bare Metal Fleets", hook: "Zero-touch bring-up for racks of servers.", tags: ["bare-metal", "gitops"], level: "intermediate" },
  { title: "Load Balancing on Bare Metal Without a Cloud", hook: "BGP, ARP, and what replaces the cloud load balancer.", tags: ["bare-metal", "networking"], level: "beginner" },
  { title: "Cluster API for Metal at Scale", hook: "Declarative lifecycle for thousands of physical nodes.", tags: ["bare-metal", "platform-engineering"], level: "advanced" },
  // Observability
  { title: "OpenTelemetry Collector Patterns That Scale", hook: "Pipelines, sampling, and backpressure in practice.", tags: ["opentelemetry", "observability"], level: "intermediate" },
  { title: "Your First Distributed Trace", hook: "Instrument a small service and follow a request end to end.", tags: ["opentelemetry", "observability"], level: "beginner" },
  { title: "Debugging Latency with Traces, Not Hunches", hook: "A step-by-step hunt for a p99 regression.", tags: ["observability", "sre"], level: "intermediate" },
  { title: "Cardinality Is Eating Your Budget", hook: "Taming metric explosions before the bill arrives.", tags: ["observability", "cost"], level: "advanced" },
  { title: "Browser RUM for Backend Engineers", hook: "Connecting real user sessions to server traces.", tags: ["opentelemetry", "devex"], level: "beginner" },
  // Platform / GitOps / devex
  { title: "Building a Paved Road: Platform Engineering Basics", hook: "Golden paths that developers choose on their own.", tags: ["platform-engineering", "devex"], level: "beginner" },
  { title: "GitOps Without the Drama", hook: "Promotion flows, rollbacks, and avoiding repo sprawl.", tags: ["gitops", "platform-engineering"], level: "intermediate" },
  { title: "Preview Environments for Every Pull Request", hook: "Ephemeral namespaces that clean up after themselves.", tags: ["gitops", "devex"], level: "intermediate" },
  { title: "Internal Developer Portals: Worth It?", hook: "What we measured before and after adopting one.", tags: ["platform-engineering", "devex"], level: "intermediate" },
  { title: "Kubernetes Cost Allocation That Teams Believe", hook: "Showback numbers engineers trust enough to act on.", tags: ["cost", "platform-engineering"], level: "intermediate" },
  { title: "Fast Inner Loops for Cluster Development", hook: "Cut the edit-to-running-change cycle to seconds.", tags: ["devex", "gitops"], level: "beginner" },
  // Security / supply chain / policy
  { title: "Securing the Software Supply Chain, Step by Step", hook: "Signing and verifying images in a real pipeline.", tags: ["supply-chain", "security"], level: "beginner" },
  { title: "SBOMs Are Not Enough", hook: "What provenance attestations add and how to verify them.", tags: ["supply-chain", "security"], level: "advanced" },
  { title: "Policy as Code with Admission Controllers", hook: "Writing guardrails that developers do not hate.", tags: ["policy", "security"], level: "intermediate" },
  { title: "Zero Trust Networking for Clusters", hook: "mTLS, identity, and the limits of network policy.", tags: ["security", "networking"], level: "intermediate" },
  { title: "Secrets Management Without Tears", hook: "Rotating credentials without redeploying everything.", tags: ["security", "devex"], level: "beginner" },
  { title: "Buy Our Platform: A Security Product Demo", hook: "See SentinelWorks scan your clusters in five minutes.", tags: ["security", "policy"], level: "beginner", vendor: true },
  // Reliability / SRE / incidents
  { title: "SLOs for Humans", hook: "Picking targets that match what users actually feel.", tags: ["reliability", "sre"], level: "beginner" },
  { title: "Error Budgets in Practice", hook: "Using budgets to decide when to ship and when to stop.", tags: ["reliability", "sre"], level: "intermediate" },
  { title: "Running a Calm Incident", hook: "Roles, comms, and checklists that reduce panic.", tags: ["incident-response", "sre"], level: "beginner" },
  { title: "Postmortems That Change Things", hook: "Turning a blameless review into fixes that stick.", tags: ["incident-response", "reliability"], level: "intermediate" },
  { title: "Chaos Engineering on a Budget", hook: "Small, safe experiments that find real weaknesses.", tags: ["reliability", "incident-response"], level: "intermediate" },
  { title: "OOMKilled: A Field Guide", hook: "Why pods die from memory limits and how to diagnose it fast.", tags: ["incident-response", "scheduling"], level: "beginner" },
  { title: "AI-Assisted Incident Investigation", hook: "What automated root cause analysis gets right and wrong.", tags: ["incident-response", "ai-ml"], level: "intermediate" },
  // Scheduling / autoscaling / storage / databases
  { title: "Autoscaling on the Right Signal", hook: "Beyond CPU: queue depth, latency, and custom metrics.", tags: ["autoscaling", "observability"], level: "intermediate" },
  { title: "Bin Packing and the Scheduler You Did Not Know You Had", hook: "Tuning scoring plugins for dense, cheap clusters.", tags: ["scheduling", "cost"], level: "advanced" },
  { title: "Stateful Workloads Without Fear", hook: "StatefulSets, PVCs, and what happens on node loss.", tags: ["storage", "databases"], level: "beginner" },
  { title: "Postgres on Kubernetes in Production", hook: "Operators, backups, and a failover we did not plan.", tags: ["databases", "storage"], level: "intermediate" },
  { title: "Volume Snapshots and Disaster Recovery", hook: "Proving your restore works before you need it.", tags: ["storage", "reliability"], level: "intermediate" },
  // AI / GPU
  { title: "Sharing GPUs Across Teams", hook: "Time slicing, partitioning, and fair queues.", tags: ["gpu", "scheduling"], level: "intermediate" },
  { title: "Serving Models on Kubernetes", hook: "Autoscaling inference without cold-start pain.", tags: ["ai-ml", "autoscaling"], level: "intermediate" },
  { title: "Evaluating LLM Features Before You Ship Them", hook: "Regression tests for non-deterministic systems.", tags: ["ai-ml", "devex"], level: "beginner" },
  { title: "GPU Cost Control for ML Platforms", hook: "Idle accelerators are the most expensive line item.", tags: ["gpu", "cost"], level: "advanced" },
  // Networking / mesh / edge / wasm
  { title: "Service Mesh: Do You Actually Need One?", hook: "An honest decision framework with real overhead numbers.", tags: ["service-mesh", "networking"], level: "beginner" },
  { title: "Gateway API in Practice", hook: "Migrating from ingress without a big-bang cutover.", tags: ["networking", "platform-engineering"], level: "intermediate" },
  { title: "Debugging DNS in Kubernetes", hook: "The five places name resolution quietly fails.", tags: ["networking", "incident-response"], level: "beginner" },
  { title: "Kubernetes at the Edge with Tiny Machines", hook: "Running clusters on flaky links and single-board computers.", tags: ["edge", "reliability"], level: "intermediate" },
  { title: "WebAssembly Workloads Beyond the Browser", hook: "Millisecond cold starts and a smaller attack surface.", tags: ["wasm", "edge"], level: "beginner" },
  { title: "Multi-Cluster Traffic Without Tears", hook: "Failover and locality across regions.", tags: ["service-mesh", "reliability"], level: "advanced" },
  // Community / accessibility / lightning
  { title: "Accessible Dashboards and CLIs", hook: "Making operational tools usable with a screen reader.", tags: ["accessibility", "devex"], level: "beginner" },
  { title: "Designing Conferences for Everyone", hook: "Quiet rooms, captions, and clear step-free routes.", tags: ["accessibility"], level: "beginner" },
  { title: "Panel: Hiring and Growing Platform Engineers", hook: "Hard-won advice from people who have built these teams.", tags: ["platform-engineering"], level: "beginner", format: "panel" },
  { title: "Panel: Running Production Without Burning Out", hook: "On-call, sustainability, and saying no.", tags: ["sre", "reliability"], level: "beginner", format: "panel" },
  { title: "Lightning: Five Kubectl Tricks You Will Use Tomorrow", hook: "Five minutes, five commands.", tags: ["devex"], level: "beginner", format: "lightning" },
  { title: "Lightning: One Metric to Watch During a Rollout", hook: "A single graph that catches most bad deploys.", tags: ["observability", "reliability"], level: "beginner", format: "lightning" },
  { title: "Workshop: Build a Hybrid Search Over Conference Talks", hook: "Combine keyword and vector search in an afternoon.", tags: ["ai-ml", "devex"], level: "intermediate", format: "workshop" },
  { title: "Workshop: Trace a Request Through Five Services", hook: "Hands-on OpenTelemetry with a deliberately broken app.", tags: ["opentelemetry", "observability"], level: "beginner", format: "workshop" },
];
