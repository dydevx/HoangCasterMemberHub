export const subscriptionPlans = {
  starter: {
    customerLimit: 100,
    serviceLimit: 10,
    promotionLimit: 3
  },
  standard: {
    customerLimit: 1000,
    serviceLimit: 50,
    promotionLimit: 20
  },
  premium: {
    customerLimit: null,
    serviceLimit: null,
    promotionLimit: null
  }
};

export function normalizeSubscriptionPlan(value) {
  return subscriptionPlans[value] ? value : "standard";
}

export function subscriptionPlanLimits(value) {
  return subscriptionPlans[normalizeSubscriptionPlan(value)];
}

