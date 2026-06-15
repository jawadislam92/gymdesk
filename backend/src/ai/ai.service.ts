import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { CreateLeadInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LeadsService } from '../leads/leads.service';
import { ClassesService } from '../classes/classes.service';
import { addDays } from '../common/date';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface CaptureLeadInput {
  fullName?: string;
  phone?: string;
  email?: string;
  interest?: string;
}

/**
 * AI Receptionist — a config-gated virtual front-desk assistant.
 *
 * Mirrors the Stripe pattern ({@link BillingService}): until `ANTHROPIC_API_KEY`
 * is set the whole feature stays dormant — `isEnabled()` is false, the public chat
 * widget never renders, and the chat endpoint returns a graceful "not available"
 * message instead of erroring. The moment the owner adds an Anthropic key it lights
 * up — no code change needed. The model is overridable with `AI_MODEL`.
 *
 * It answers prospects' questions from live gym context (plans + class schedule),
 * and when a visitor is interested it calls the `capture_lead` tool, which writes a
 * Lead straight into the CRM pipeline so the team can follow up.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey = (process.env.ANTHROPIC_API_KEY ?? '').trim();
  private readonly model = (process.env.AI_MODEL ?? 'claude-opus-4-8').trim();
  private client?: Anthropic;

  constructor(
    private readonly prisma: PrismaService,
    private readonly leads: LeadsService,
    private readonly classes: ClassesService,
  ) {}

  isEnabled(): boolean {
    return this.apiKey.length > 0;
  }

  private getClient(): Anthropic {
    if (!this.client) this.client = new Anthropic({ apiKey: this.apiKey });
    return this.client;
  }

  /** Lightweight status for the public widget — whether to show the chat at all. */
  async status(slug: string): Promise<{ enabled: boolean; gymName: string }> {
    const gym = await this.prisma.gym.findFirst({
      where: { slug, deletedAt: null },
      select: { name: true },
    });
    if (!gym) throw new NotFoundException('Gym not found');
    return { enabled: this.isEnabled(), gymName: gym.name };
  }

  async chat(
    slug: string,
    history: ChatTurn[],
  ): Promise<{ enabled: boolean; reply: string; leadCaptured: boolean }> {
    const gym = await this.prisma.gym.findFirst({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        country: true,
        currency: true,
        timezone: true,
      },
    });
    if (!gym) throw new NotFoundException('Gym not found');

    if (!this.isEnabled()) {
      return {
        enabled: false,
        reply:
          'Our live assistant is offline right now — pop your details into the form below and the team will get right back to you!',
        leadCaptured: false,
      };
    }

    const system = await this.buildSystemPrompt(gym);
    const tools: Anthropic.Tool[] = [
      {
        name: 'capture_lead',
        description:
          "Save a prospective member's contact details so the gym team can follow up. " +
          'Call this as soon as the visitor has shared their name together with a phone ' +
          'number or email, or when they ask to book a trial, tour, or callback. Only call ' +
          'it once you have at least a name and one way to reach them.',
        input_schema: {
          type: 'object',
          properties: {
            fullName: { type: 'string', description: "The visitor's name." },
            phone: { type: 'string', description: 'Phone or WhatsApp number, if given.' },
            email: { type: 'string', description: 'Email address, if given.' },
            interest: {
              type: 'string',
              description: 'What they are interested in — a plan, class, trial, or tour. One short phrase.',
            },
          },
          required: ['fullName'],
        },
      },
    ];

    const messages: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    let leadCaptured = false;
    let reply = '';

    try {
      const client = this.getClient();
      // Manual tool-use loop: answer → (maybe capture_lead) → answer. Capped so a
      // misbehaving turn can never loop forever on the paid API.
      for (let i = 0; i < 4; i += 1) {
        const res = await client.messages.create({
          model: this.model,
          max_tokens: 1024,
          system,
          tools,
          messages,
        });

        const text = res.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('')
          .trim();
        if (text) reply = text;

        const toolUses = res.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        );
        if (res.stop_reason !== 'tool_use' || toolUses.length === 0) break;

        messages.push({ role: 'assistant', content: res.content });
        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const tu of toolUses) {
          if (tu.name === 'capture_lead') {
            const out = await this.captureLead(gym.id, tu.input as CaptureLeadInput);
            leadCaptured = leadCaptured || out.created;
            results.push({ type: 'tool_result', tool_use_id: tu.id, content: out.message });
          } else {
            results.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              content: 'Unknown tool.',
              is_error: true,
            });
          }
        }
        messages.push({ role: 'user', content: results });
      }
    } catch (e) {
      this.logger.error(`AI chat failed: ${(e as Error).message}`);
      return {
        enabled: true,
        reply:
          'Sorry — I hit a snag just now. Please try again in a moment, or leave your details in the form below and the team will reach out.',
        leadCaptured,
      };
    }

    if (!reply) reply = `Thanks for reaching out! How can I help you get started at ${gym.name}?`;
    return { enabled: true, reply, leadCaptured };
  }

  /** Write a captured lead into the CRM, de-duplicating on phone/email per gym. */
  private async captureLead(
    gymId: string,
    input: CaptureLeadInput,
  ): Promise<{ created: boolean; message: string }> {
    const fullName = (input.fullName ?? '').trim();
    const phone = input.phone?.trim() || undefined;
    const email = input.email?.trim() || undefined;
    const interest = input.interest?.trim() || undefined;
    if (!fullName) return { created: false, message: 'Need at least the visitor’s name to save them.' };

    if (phone || email) {
      const existing = await this.prisma.lead.findFirst({
        where: {
          gymId,
          OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])],
        },
        select: { id: true },
      });
      if (existing) return { created: false, message: 'Already saved — the team has these details.' };
    }

    const dto: CreateLeadInput = { fullName, email, phone, message: interest };
    await this.leads.create(gymId, dto, 'ai_receptionist');
    return { created: true, message: 'Saved. The team will follow up shortly.' };
  }

  private async buildSystemPrompt(gym: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    country: string | null;
    currency: string;
    timezone: string;
  }): Promise<string> {
    const [plans, classes] = await Promise.all([
      this.prisma.membershipPlan.findMany({
        where: { gymId: gym.id, isActive: true, deletedAt: null },
        orderBy: { price: 'asc' },
        select: { name: true, price: true, durationDays: true, description: true, classCredits: true },
      }),
      this.classes.list(gym.id, new Date(), addDays(new Date(), 14)),
    ]);

    const planLines = plans.length
      ? plans
          .map((p) => {
            const credits = p.classCredits == null ? 'unlimited classes' : `${p.classCredits} class credits`;
            const desc = p.description ? ` — ${p.description}` : '';
            return `- ${p.name}: ${gym.currency} ${Number(p.price)} for ${p.durationDays} days (${credits})${desc}`;
          })
          .join('\n')
      : 'No plans are listed online yet — offer to have the team share current pricing.';

    const classLines = classes.length
      ? classes
          .slice(0, 8)
          .map((c) => {
            const when = this.formatWhen(c.startsAt, gym.timezone);
            return `- ${c.title}${when ? ` — ${when}` : ''}${c.trainerName ? ` with ${c.trainerName}` : ''}`;
          })
          .join('\n')
      : 'No classes are on the public schedule right now.';

    const location = [gym.address, gym.city, gym.country].filter(Boolean).join(', ');

    return [
      `You are the friendly virtual receptionist for ${gym.name}${location ? `, a gym in ${[gym.city, gym.country].filter(Boolean).join(', ')}` : ''}. You chat with prospective members on the gym's public web page.`,
      '',
      'Your goals, in order:',
      '1. Warmly answer questions about membership plans, the class schedule, and the gym.',
      '2. Encourage interested visitors to join or to book a free trial or tour.',
      '3. When a visitor is interested, collect their name plus a phone number or email, then call the capture_lead tool so the team can follow up.',
      '',
      'Membership plans:',
      planLines,
      '',
      'Upcoming classes (next 2 weeks):',
      classLines,
      location ? `\nLocation: ${location}` : '',
      '',
      'Guidelines:',
      '- Keep replies short and conversational — 1 to 3 sentences. Plain text only; no markdown, headings, or bullet symbols.',
      `- Currency is ${gym.currency}. Never invent prices, opening hours, phone numbers, or policies that are not given above. If you do not know something, say the team will confirm and offer to take the visitor's details.`,
      '- Do not give medical, injury, or diet advice; suggest they speak with one of the gym’s trainers.',
      '- Call capture_lead as soon as you have the visitor’s name and a phone number or email, or when they ask to book a trial, tour, or callback. Do not ask for the same details again once captured.',
      '- Stay on topic: this gym and fitness. Politely decline unrelated requests.',
    ].join('\n');
  }

  private formatWhen(iso: string | Date, tz: string): string {
    try {
      return new Date(iso).toLocaleString('en-US', {
        timeZone: tz || 'UTC',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return new Date(iso).toISOString().slice(0, 16).replace('T', ' ');
    }
  }
}
