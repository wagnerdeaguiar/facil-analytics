import Stripe from 'stripe';
import { prisma } from '@/lib/db';

export const stripe =
  process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
    : null;

export const PREMIUM_PRICE_BRL = 4.99;

export async function createCheckoutSession(userId: string, email: string) {
  if (!stripe) throw new Error('Stripe não configurado. Defina STRIPE_SECRET_KEY no .env');

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error('STRIPE_PRICE_ID não configurado');

  const sub = await prisma.subscription.upsert({
    where: { userId },
    create: { userId, status: 'free' },
    update: {},
  });

  let customerId = sub.gatewayCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { userId } });
    customerId = customer.id;
    await prisma.subscription.update({
      where: { userId },
      data: { gatewayCustomerId: customerId, gateway: 'stripe' },
    });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3010';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?premium=activated`,
    cancel_url: `${baseUrl}/precos?canceled=1`,
    metadata: { userId },
  });

  return session;
}

export async function handleStripeWebhook(rawBody: string, signature: string) {
  if (!stripe) throw new Error('Stripe não configurado');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET não configurado');

  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;

      await prisma.subscription.update({
        where: { userId },
        data: {
          status: 'active',
          plano: 'premium',
          valor: PREMIUM_PRICE_BRL,
          gateway: 'stripe',
          gatewaySubscriptionId: session.subscription as string,
          gatewayPaymentId: session.payment_intent as string,
          dataInicio: new Date(),
          dataRenovacao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionStatus: 'active' },
      });
      await prisma.auditLog.create({
        data: {
          userId,
          eventType: 'payment_approved',
          description: 'Assinatura Premium ativada',
          metadata: { sessionId: session.id },
        },
      });
      break;
    }
    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const subRecord = await prisma.subscription.findFirst({
        where: { gatewaySubscriptionId: subscription.id },
      });
      if (!subRecord) break;

      const statusMap: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'failed',
        incomplete: 'failed',
        incomplete_expired: 'expired',
      };
      const status = statusMap[subscription.status] ?? 'free';

      await prisma.subscription.update({
        where: { id: subRecord.id },
        data: {
          status,
          dataCancelamento: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000)
            : null,
        },
      });
      await prisma.user.update({
        where: { id: subRecord.userId },
        data: { subscriptionStatus: status },
      });
      break;
    }
    default:
      break;
  }
}
