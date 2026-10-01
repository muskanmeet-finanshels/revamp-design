export interface DemoSource { id: string; title: string; detail: string }
export interface DemoMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: DemoSource[];
  draft?: boolean;
}
export interface DemoTask { ref: string; title: string; status: string; note: string }

export const SCENARIO = 'Nexora- Monthly Accounting – September';
export const TASKS: DemoTask[] = [
  { ref: 'DEMO-101', title: 'Obtain September bank statement', status: 'Blocked', note: 'Client has not shared the statement for the operating account.' },
  { ref: 'DEMO-102', title: 'Review September reconciliation', status: 'Pending review', note: 'Waiting on the bank statement before review can finish.' },
];
const S_TASK: DemoSource = { id: 's1', title: 'Fictional task record DEMO-101', detail: 'Sample data for this demo only. Not from a real PMS project.' };
const S_REV: DemoSource = { id: 's2', title: 'Fictional task record DEMO-102', detail: 'Sample data for this demo only. Review depends on DEMO-101.' };
const S_NOTE: DemoSource = { id: 's3', title: 'Fictional activity note', detail: 'Invented note: statement requested twice, no reply yet.' };

export const GREETING = "Hi, I'm your PMS AI Assistant.\n\nI can help you find pending work, understand blockers, and prepare follow-ups.\n\nWhat would you like to do? This demo uses a fictional Nexora project.";
export const QUICK_PROMPTS = ['What work is pending?', 'What is blocking this?', 'Draft a follow-up'];

export const DRAFT_TEXT = `Subject: Bank statement needed for September accounting\n\nHi Nexora team,\n\nWe still need the September bank statement for the operating account to finish the reconciliation (DEMO-101). Once received, we can complete the review (DEMO-102).\n\nCould you share it by end of week?\n\nThank you.`;

let n = 0;
export const mid = () => `m${Date.now().toString(36)}${n++}`;

export function demoReply(input: string): Omit<DemoMessage, 'id' | 'role'> {
  const q = input.toLowerCase();
  if (/complete.*without|approv|exception|human|person|handover|review request/.test(q))
    return { text: 'I cannot approve an exception or contact a person in this demo. The fictional tasks require the bank statement. Use Handover preview to review the task references and full conversation for the project owner. Nothing will be sent.', sources: [S_TASK, S_REV] };
  if (/follow.?up|draft|email|remind|message the client/.test(q))
    return { text: 'Here is an editable follow-up draft. Nothing is sent from this demo; you can save a local preview only.', sources: [S_TASK, S_NOTE], draft: true };
  if (/block|stuck|wait|why|delay/.test(q))
    return { text: 'One blocker: DEMO-101, the September bank statement, has not been received from Nexora. It holds up DEMO-102, the reconciliation review.', sources: [S_TASK, S_NOTE] };
  if (/work|task|pending|open|status|todo|to do|left/.test(q))
    return { text: `Two tasks are pending for ${SCENARIO}:\n1. DEMO-101 Obtain bank statement (Blocked)\n2. DEMO-102 Review reconciliation (Pending review)`, sources: [S_TASK, S_REV] };
  return { text: 'I cannot answer that in this demo. It only has scripted replies about pending work, blockers, and a follow-up draft for the fictional Nexora scenario. It has no live data or AI.' };
}

export function buildHandover(messages: DemoMessage[], draft: string | null): string {
  const lines = [`HANDOVER PREVIEW (fictional demo, not sent)`, `Scenario: ${SCENARIO}`, '', 'Task references:'];
  TASKS.forEach((t) => lines.push(`- ${t.ref} ${t.title} [${t.status}]: ${t.note}`));
  lines.push('', 'Saved follow-up draft (local only):', draft ?? '(none saved)', '', 'Full chat:');
  messages.forEach((m) => lines.push(`${m.role === 'user' ? 'You' : 'Assistant'}: ${m.text}`));
  return lines.join('\n');
}
