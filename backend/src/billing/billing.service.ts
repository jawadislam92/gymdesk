import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';

const STRIPE_API = 'https://api.stripe.com/v1';

/**
 * Online card payments via Stripe Checkout — intentionally **config-gated**.
 *
 * Until `STRIPE_SECRET_KEY` is set the whole feature stays dormant: `isEnabled()`
 * is false and the endpoints return a clear 503 instead of failing obscurely. This
 * lets the app run perfectly with manual/cash payments and "light up" online cards
 * the moment the owner adds their (test, then live) keys — no code change needed.
 *
 * Implemented against Stripe's REST API with `fetch` (no SDK dependency). Flow:
 *   checkout → hosted Stripe page → redirect back with ?paid=<session_id> →
 *   confirm (retrieve session, verify paid, record the payment idempotently).
 * Webhooks are a later hardening (so payment is captured even if the payer closes
 * the tab); the gateway-ref idempotency here already makes that safe to add.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly secret = (process.env.STRIPE_SECRET_KEY ?? '').trim();

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  isEnabled(): boolean {
    return this.secret.length > 0;
  }

  private ensureEnabled(): void {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException(
        'Online payments are not configured. Add STRIPE_SECRET_KEY to enable.',
      );
    }
  }

  private async stripe(
    path: string,
    form?: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${STRIPE_API}${path}`, {
      method: form ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${this.secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      ...(form ? { body: new URLSearchParams(form).toString() } : {}),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const message =
        (data.error as { message?: string } | undefined)?.message ?? 'Stripe request failed';
      this.logger.error(`Stripe ${path} → ${res.status}: ${message}`);
      throw new BadRequestException(message);
    }
    return data;
  }

  /** Create a Stripe Checkout session for a member to pay by card. Returns the
   *  hosted payment URL to redirect/hand to the payer. */
  async createCheckout(
    gymId: string,
    dto: { memberId: string; membershipId?: string; amount: number; description?: string },
  ): Promise<{ url: string }> {
    this.ensureEnabled();
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, gymId, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Member not found');
    const gym = await this.prisma.gym.findUniqueOrThrow({ where: { id: gymId } });
    const base = (process.env.APP_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

    const session = await this.stripe('/checkout/sessions', {
      mode: 'payment',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': gym.currency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(Math.round(dto.amount * 100)),
      'line_items[0][price_data][product_data][name]': dto.description ?? `Payment — ${gym.name}`,
      success_url: `${base}/payments?paid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/payments?paid=cancelled`,
      'metadata[gymId]': gymId,
      'metadata[memberId]': dto.memberId,
      ...(dto.membershipId ? { 'metadata[membershipId]': dto.membershipId } : {}),
    });
    return { url: String(session.url) };
  }

  /** Confirm a returned checkout session and record the payment (idempotent). */
  async confirm(gymId: string, sessionId: string): Promise<{ recorded: boolean; payment?: unknown }> {
    this.ensureEnabled();
    const session = await this.stripe(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
    const metadata = (session.metadata ?? {}) as Record<string, string>;
    if (metadata.gymId && metadata.gymId !== gymId) {
      throw new BadRequestException('Checkout session does not belong to this gym');
    }
    if (session.payment_status !== 'paid') return { recorded: false };

    const payment = await this.payments.recordOnline({
      gymId,
      memberId: metadata.memberId,
      membershipId: metadata.membershipId ?? null,
      amount: Number(session.amount_total ?? 0) / 100,
      currency: String(session.currency ?? 'usd').toUpperCase(),
      gatewayRef: String(session.id),
    });
    return { recorded: true, payment };
  }
}
