export interface KpiMetrics {
  totalMembers: number;
  totalMembersLabel: string;
  activeProjects: number;
  activeProjectsLabel: string;
  totalStudents: number;
  totalStudentsLabel: string;
  platformUptime: string;
  platformStatus: "online" | "degraded" | "offline";
  dbLatencyMs: number;
}

export interface DivisionVehicleSpecs {
  frame: string;
  propulsion: string;
  sensors: string[];
  computing: string;
  autopilot: string;
  softwareStack: string[];
  batteryTelemetry: string;
}

export interface DivisionData {
  slug: "harpia" | "nautilus";
  name: string;
  fullName: string;
  typeLabel: string;
  vehicleType: "UAV" | "AUV";
  founded: number;
  status: string;
  statusType: "operational" | "testing" | "maintenance";
  statusBeaconColor: string;
  summary: string;
  competitions: string[];
  specs: DivisionVehicleSpecs;
  stats: {
    membersCount: number;
    projectsCount: number;
    competitionsCount: number;
  };
  accentColor: {
    primary: string;
    secondary: string;
    glow: string;
    border: string;
    badgeBg: string;
  };
}

export interface MemberRecord {
  id: number;
  name: string;
  role: string;
  area: "Software" | "Mecânica" | "Eletrônica" | "Gestão";
  division: "harpia" | "nautilus" | "geral";
  divisionLabel: string;
  bio: string | null;
  course: string | null;
  active: boolean;
  linkedin: string | null;
  github: string | null;
}

export interface ProjectRecord {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  status: string;
  year: number;
  division: "harpia" | "nautilus";
  tags: string[];
}

export interface SystemStatusData {
  database: {
    status: "online" | "degraded" | "offline";
    provider: string;
    host: string;
    port: number;
    latencyMs: number;
    pooled: boolean;
  };
  auth: {
    status: "online" | "degraded";
    engine: string;
    algorithm: string;
    cookieName: string;
    saltRounds: number;
  };
  courses: {
    status: "online" | "offline";
    courseSlug: string;
    courseTitle: string;
    modulesCount: number;
    lessonsCount: number;
    exercisesCount: number;
    availableVideos: number;
    pendingVideos: number;
    textOnlyLessons: number;
  };
}

export interface OperationalLog {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARN" | "DEBUG";
  source: "DB" | "AUTH" | "ENSINO" | "TELEMETRY" | "SYSTEM";
  message: string;
}

export interface GestaoStatsResponse {
  success: boolean;
  timestamp: string;
  kpis: KpiMetrics;
  divisions: DivisionData[];
  members: MemberRecord[];
  projects: ProjectRecord[];
  system: SystemStatusData;
  operationalLogs: OperationalLog[];
}
