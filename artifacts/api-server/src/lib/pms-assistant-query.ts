import type { PmsAssistantAnswer } from "@workspace/api-zod";

export type QueryIntent = NonNullable<PmsAssistantAnswer["intent"]>;
export interface AssistantQueryContext {
  intent: QueryIntent;
  scope: "portfolio" | "explicit";
  target?: { kind: "client" | "project"; name: string };
  assignee: "self" | "authorized";
  date: "today" | "overdue" | null;
  timeZone: string | null;
  today: string | null;
  clarification?: string;
}

export function validTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100 || !value.trim()) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; }
  catch { return false; }
}

export function localDay(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function describeQuery(
  question: string, timeZone: unknown, now = new Date(),
): AssistantQueryContext {
  const q = question.toLowerCase();
  // "Show me" is a request, and "my clients" is portfolio scope, not ownership.
  const self = /\bmy\s+(?:(?:today['’]s|overdue|pending|open|blocked)\s+)?(?:tasks?|work|items?|assignments?)\b|\bmy\s+today\b|\bmine\b|\bassigned\s+to\s+me\b|\bfor\s+me\b/.test(q);
  const today = /\btoday(?:'s|’s)?\b/.test(q);
  const overdue = /\b(overdue|past due|late tasks)\b/.test(q);
  const pending = /\b(pending|unfinished|outstanding|open tasks|open work)\b/.test(q);
  const blockers = /\b(blockers?|blocking|blocked)\b/.test(q);
  const context: AssistantQueryContext = {
    intent: overdue ? "overdue" : today && self ? "my_today" : blockers ? "blockers" : pending ? "pending" : "general",
    scope: "portfolio",
    assignee: self ? "self" : "authorized",
    date: overdue ? "overdue" : today ? "today" : null,
    timeZone: validTimeZone(timeZone) ? timeZone : null,
    today: validTimeZone(timeZone) ? localDay(now, timeZone) : null,
  };
  const quoted = question.match(/\b(client|project)\s+(?:"([^"]+)"|“([^”]+)”|'([^']+)')/i);
  const explicit = question.match(/\b(?:for|from|in|under)\s+(?:the\s+)?(client|project)\s+(.+?)\s*[?.!]?$/i);
  if (quoted || explicit) {
    const match = quoted ?? explicit!;
    const name = (quoted ? quoted[2] ?? quoted[3] ?? quoted[4] : match[2]).replace(/^[“"'‘]|[”"'’]$/g, "").trim();
    if (name) { context.scope = "explicit"; context.target = { kind: match[1].toLowerCase() as "client" | "project", name }; }
  }
  if (/\b(this|that|current|selected)\s+(client|project|task)\b/.test(q) || /\b(it|this)\b/.test(q) && blockers) {
    context.clarification = "Which client, project, or task do you mean? I do not assume the page you are viewing.";
  } else if (/\bfor\s+(?!all\b|my\b|me\b|client\b|project\b)([^?.!]+)[?.!]?$/.test(q) && !explicit) {
    context.clarification = "Please name the client or project explicitly, for example “overdue tasks for client Acme”.";
  } else if (/\b(client|project)\b/.test(q) && !context.target) {
    context.clarification = "Which client or project do you mean? Name it explicitly, for example “pending tasks for client Acme”, or put the name in quotes.";
  } else if (today && overdue) {
    context.clarification = "Do you want work due today or work already overdue? They are separate views.";
  } else if (context.date && !context.timeZone) {
    context.clarification = "Your account timezone is not available. Please configure it before asking for today's or overdue work.";
  }
  return context;
}

export interface QueryTask {
  status?: string;
  assigneeSubjectId?: string;
  dueDate?: string | null;
  blocked?: boolean;
}

export function isTaskQuery(context: AssistantQueryContext): boolean {
  return context.intent !== "general" || context.date !== null || context.assignee === "self";
}

export function taskMetadataAvailable(task: QueryTask, context: AssistantQueryContext): boolean {
  return typeof task.status === "string" && !!task.status.trim()
    && (context.assignee !== "self" || typeof task.assigneeSubjectId === "string")
    && (!context.date || task.dueDate === null || typeof task.dueDate === "string" && dueDay(task.dueDate, context.timeZone!) !== null);
}

function dueDay(due: string, timeZone: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    const parsed = new Date(`${due}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === due ? due : null;
  }
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(due)) return null;
  const parsed = new Date(due);
  return Number.isFinite(parsed.getTime()) ? localDay(parsed, timeZone) : null;
}

export function matchesQueryTask(task: QueryTask, context: AssistantQueryContext, subjectId: string): boolean {
  if (!taskMetadataAvailable(task, context)) return false;
  if (["completed", "complete", "done", "archived", "cancelled", "canceled"].includes(task.status!.trim().toLowerCase())) return false;
  if (context.assignee === "self" && task.assigneeSubjectId !== subjectId) return false;
  if (context.intent === "blockers" && task.blocked !== true && task.status!.trim().toLowerCase() !== "blocked") return false;
  if (!context.date) return true;
  const day = typeof task.dueDate === "string" ? dueDay(task.dueDate, context.timeZone!) : null;
  return day !== null && (context.date === "today" ? day === context.today : day < context.today!);
}