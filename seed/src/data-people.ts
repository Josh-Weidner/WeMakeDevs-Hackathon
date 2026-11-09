export const ROOMS = [
  { id: "room-1", name: "Hall A", capacity: 150, floor: "1", quiet: false, route: "Main entrance, then straight ahead on level ground. Wide double doors, no steps.", notes: "Largest room. Hearing loop installed; live captions on the main screen." },
  { id: "room-2", name: "Hall B", capacity: 120, floor: "1", quiet: false, route: "From the lobby, turn left past registration. Level floor, automatic doors.", notes: "Live captions; reserved wheelchair spaces at the front and rear." },
  { id: "room-3", name: "Room 3", capacity: 80, floor: "2", quiet: false, route: "Use the north elevator from the lobby to floor 2, then turn right. No steps.", notes: "Captions on request. Aisle seating available." },
  { id: "room-4", name: "Room 4", capacity: 40, floor: "2", quiet: false, route: "North elevator to floor 2, then the second door on the left. No steps.", notes: "Small room that fills quickly. Arrive early or watch the stream." },
  { id: "room-5", name: "Room 5", capacity: 60, floor: "2", quiet: false, route: "North elevator to floor 2, end of the corridor. Level access.", notes: "Dimmable lighting. Captions on request." },
  { id: "room-6", name: "Workshop Lab", capacity: 30, floor: "1", quiet: false, route: "From the lobby, follow the signs behind the cafe. Ramp, no steps.", notes: "Tables and power at every seat. Best for hands-on sessions." },
  { id: "room-7", name: "Room 7", capacity: 50, floor: "3", quiet: false, route: "South elevator to floor 3, then straight ahead. No steps.", notes: "Quieter corner of the venue. Captions on request." },
  { id: "room-8", name: "Quiet Room", capacity: 15, floor: "1", quiet: true, route: "Beside the lobby, 20 m from the entrance. Level floor, no steps.", notes: "Low light, no sound, no talks. For breaks, calls, and planned 1:1 intros." },
] as const;

export const FIRST_NAMES = ["Alex", "Sam", "Priya", "Jordan", "Marisol", "Tomasz", "Keiko", "Rafael", "Aisha", "Lars", "Nia", "Ingrid", "Mateo", "Zainab", "Hiro", "Chloe", "Dmitri", "Amara", "Olu", "Sofia", "Kwame", "Elif", "Noor", "Felix", "Anika", "Jasper", "Lucia", "Tariq", "Mei", "Callum", "Ngozi", "Andrés", "Yara", "Bjorn", "Imani", "Soren", "Leilani", "Kofi", "Greta", "Rohan", "Camila", "Idris", "Hannah", "Viktor", "Esra", "Dev", "Malia", "Anton", "Thandi", "Ravi"];
export const LAST_NAMES = ["Rivera", "Chen", "Okafor", "Brandt", "Tanaka", "Costa", "Rahman", "Nilsson", "Williams", "Haddad", "Fernandez", "Kowalski", "Mensah", "Petrov", "Sato", "Dubois", "Adeyemi", "Lindqvist", "Moreau", "Kapoor", "Novak", "Osei", "Yilmaz", "Santos", "Ibrahim", "Larsen", "Gutierrez", "Nakamura", "Hughes", "Abara"];

/** All fictional. Each maps to a company type used by contacts recall ("who worked at a bank"). */
export const COMPANIES: Array<{ name: string; type: string }> = [
  { name: "Halden Bank", type: "bank" },
  { name: "Ferro Savings", type: "bank" },
  { name: "Brightcart", type: "retailer" },
  { name: "Gridline Telecom", type: "telco" },
  { name: "Ironvale Hosting", type: "hosting provider" },
  { name: "Polar Freight", type: "logistics" },
  { name: "Meridian Health", type: "healthcare" },
  { name: "Quillstack", type: "startup" },
  { name: "Lumen Labs", type: "startup" },
  { name: "Orchard Insurance", type: "insurance" },
  { name: "Tidewater Energy", type: "energy" },
  { name: "Skyloft Games", type: "gaming" },
  { name: "NimbusCloud", type: "cloud vendor" },
  { name: "SentinelWorks", type: "security vendor" },
  { name: "Foundry Media", type: "media" },
];

export const ROLES = ["Platform Engineer", "Site Reliability Engineer", "Staff Engineer", "Engineering Manager", "DevOps Engineer", "Backend Engineer", "Security Engineer", "Infrastructure Engineer", "Developer Advocate", "Solutions Architect", "Data Engineer", "Principal Engineer"];

export const STACKS: Array<{ stack: string; interests: string[] }> = [
  { stack: "Kubernetes on AWS EKS, Terraform, Argo CD, Prometheus", interests: ["gitops", "platform-engineering", "observability"] },
  { stack: "Kubernetes on GKE, Istio, OpenTelemetry, Go services", interests: ["service-mesh", "opentelemetry", "reliability"] },
  { stack: "Kubernetes on Azure AKS, Flux, Kyverno, .NET services", interests: ["policy", "gitops", "security"] },
  { stack: "Nomad and Consul, a small Kubernetes footprint, Python services", interests: ["scheduling", "devex"] },
  { stack: "Serverless-first, a few managed clusters, TypeScript", interests: ["devex", "cost"] },
  { stack: "Kubernetes with Cilium and eBPF, Hubble, Grafana", interests: ["ebpf", "networking", "observability"] },
  { stack: "GPU clusters, Kubeflow, Ray, PyTorch serving", interests: ["gpu", "ai-ml", "scheduling"] },
  { stack: "Postgres operators, Rook-Ceph storage, Velero backups", interests: ["databases", "storage", "reliability"] },
  { stack: "Multi-tenant platform with vcluster, OPA Gatekeeper, Backstage", interests: ["multi-tenancy", "platform-engineering", "policy"] },
  { stack: "Edge clusters on k3s, WebAssembly workloads, MQTT", interests: ["edge", "wasm"] },
];

export const RESOURCES: Array<{ title: string; url: string; type: "doc" | "repo" | "talk"; tags: string[] }> = [
  { title: "Kubernetes: Multi-tenancy concepts", url: "https://kubernetes.io/docs/concepts/security/multi-tenancy/", type: "doc", tags: ["multi-tenancy", "security"] },
  { title: "What is eBPF?", url: "https://ebpf.io/what-is-ebpf/", type: "doc", tags: ["ebpf", "observability"] },
  { title: "OpenTelemetry documentation", url: "https://opentelemetry.io/docs/", type: "doc", tags: ["opentelemetry", "observability"] },
  { title: "Prometheus overview", url: "https://prometheus.io/docs/introduction/overview/", type: "doc", tags: ["observability", "sre"] },
  { title: "Kubernetes: Pod Quality of Service and OOM behavior", url: "https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/", type: "doc", tags: ["incident-response", "scheduling"] },
  { title: "Kubernetes: Network Policies", url: "https://kubernetes.io/docs/concepts/services-networking/network-policies/", type: "doc", tags: ["networking", "security"] },
  { title: "Kubernetes: Horizontal Pod Autoscaling", url: "https://kubernetes.io/docs/concepts/workloads/autoscaling/", type: "doc", tags: ["autoscaling"] },
  { title: "Cluster API book", url: "https://cluster-api.sigs.k8s.io/", type: "doc", tags: ["bare-metal", "platform-engineering"] },
  { title: "Argo CD documentation", url: "https://argo-cd.readthedocs.io/", type: "doc", tags: ["gitops"] },
  { title: "Open Policy Agent documentation", url: "https://www.openpolicyagent.org/docs/latest/", type: "doc", tags: ["policy", "security"] },
  { title: "Sigstore documentation", url: "https://docs.sigstore.dev/", type: "doc", tags: ["supply-chain", "security"] },
  { title: "Google SRE book: Service Level Objectives", url: "https://sre.google/sre-book/service-level-objectives/", type: "doc", tags: ["reliability", "sre"] },
];
