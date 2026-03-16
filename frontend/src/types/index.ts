export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings: Record<string, unknown>;
  createdAt: string;
}

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'AGENT';
export type UserStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  status: UserStatus;
  maxConversations: number;
  createdAt: string;
  company?: Company;
  departments?: Department[];
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  color: string;
  distributionRule: string;
  workingHours: Record<string, unknown>;
  offlineMessage?: string;
  createdAt: string;
  agents?: { user: User }[];
  _count?: { conversations: number };
}

export interface Tag {
  id: string;
  companyId: string;
  name: string;
  color: string;
  createdAt: string;
  _count?: { leads: number };
}

export interface LeadTag {
  leadId: string;
  tagId: string;
  tag: Tag;
}

export interface Lead {
  id: string;
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  countryCode: string;
  company?: string;
  site?: string;
  document?: string;
  birthdate?: string;
  notes?: string;
  address?: Record<string, unknown>;
  customFields: Record<string, unknown>;
  riskScore: number;
  createdAt: string;
  tags: LeadTag[];
  deals?: Deal[];
  conversations?: Conversation[];
  history?: LeadHistory[];
  activities?: Activity[];
  lists?: { list: { id: string; name: string } }[];
  _count?: { deals: number; conversations: number };
}

export interface Pipeline {
  id: string;
  companyId: string;
  userId: string;
  name: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'avatar'>;
  stages: Stage[];
  _count?: { deals: number };
}

export interface Stage {
  id: string;
  pipelineId: string;
  name: string;
  color: string;
  order: number;
  createdAt: string;
  deals?: Deal[];
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  defaultValue: number;
  category?: string;
  createdAt: string;
}

export interface LostReason {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
}

export type DealStatus = 'OPEN' | 'WON' | 'LOST';

export interface Deal {
  id: string;
  leadId: string;
  pipelineId: string;
  stageId: string;
  productId?: string;
  assignedUserId?: string;
  value: number;
  status: DealStatus;
  lostReasonId?: string;
  notes?: string;
  quantity: number;
  discount: number;
  surcharge: number;
  freight: number;
  createdAt: string;
  lead: Lead;
  stage: Stage;
  pipeline?: Pipeline;
  product?: Product;
  assignedUser?: Pick<User, 'id' | 'name' | 'avatar'>;
  lostReason?: LostReason;
  activities?: Activity[];
}

export interface ActivityType {
  id: string;
  companyId: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  dealId?: string;
  leadId: string;
  typeId: string;
  title: string;
  description?: string;
  dueDate?: string;
  completedAt?: string;
  assignedUserId?: string;
  createdAt: string;
  type: ActivityType;
  assignedUser?: Pick<User, 'id' | 'name'>;
}

export interface ChannelInstance {
  id: string;
  companyId: string;
  name: string;
  type: 'WHATSAPP_OFFICIAL' | 'WHATSAPP_UNOFFICIAL';
  identifier: string;
  status: string;
  config: Record<string, unknown>;
  createdAt: string;
}

export type ConversationStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'BOT';
export type MessageDirection = 'IN' | 'OUT';
export type MessageType = 'TEXT' | 'AUDIO' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'TEMPLATE' | 'SYSTEM';

export interface Message {
  id: string;
  conversationId: string;
  leadId: string;
  userId?: string;
  automationId?: string;
  direction: MessageDirection;
  type: MessageType;
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  duration?: number;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'avatar'>;
}

export interface Conversation {
  id: string;
  leadId: string;
  channelInstanceId?: string;
  departmentId?: string;
  assignedUserId?: string;
  status: ConversationStatus;
  queuePosition?: number;
  lastMessageAt: string;
  createdAt: string;
  lead: Lead;
  channelInstance?: ChannelInstance;
  department?: Department;
  assignedUser?: Pick<User, 'id' | 'name' | 'avatar' | 'status'>;
  messages?: Message[];
}

export interface Automation {
  id: string;
  companyId: string;
  name: string;
  isActive: boolean;
  trigger: Record<string, unknown>;
  flow: {
    nodes: AutomationNode[];
    edges: AutomationEdge[];
  };
  executionCount: number;
  createdAt: string;
  _count?: { executions: number };
}

export interface AutomationNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface AutomationEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface LeadHistory {
  id: string;
  leadId: string;
  type: string;
  description: string;
  metadata: Record<string, unknown>;
  automationId?: string;
  userId?: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  companyId: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsedAt?: string;
  createdAt: string;
}

export interface LeadList {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
  _count?: { members: number };
}

export interface CustomField {
  id: string;
  companyId: string;
  name: string;
  type: string;
  options?: unknown;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
