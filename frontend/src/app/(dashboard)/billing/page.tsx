'use client'

import api from '@/lib/api'

const PLANS = [
  { name: 'Free', price: '0€/mois', priceId: null, features: ['1 utilisateur', '5 projets', 'Support email'] },
  { name: 'Pro', price: '29€/mois', priceId: 'price_pro_id', features: ['10 utilisateurs', 'Projets illimités', 'Support prioritaire'] },
  { name: 'Enterprise', price: '99€/mois', priceId: 'price_enterprise_id', features: ['Utilisateurs illimités', 'SSO', 'SLA garanti'] },
]

export default function BillingPage() {
  const handleSubscribe = async (priceId: string) => {
    const res = await api.post('/billing/checkout', { priceId })
    window.location.href = res.data.url
  }

  const handlePortal = async () => {
    const res = await api.post('/billing/portal')
    window.location.href = res.data.url
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Abonnement</h1>
        <button onClick={handlePortal} className="text-sm text-blue-600 hover:underline">
          Gérer mon abonnement
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div key={plan.name} className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <p className="text-3xl font-bold mt-2 mb-4">{plan.price}</p>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-gray-600">✓ {f}</li>
              ))}
            </ul>
            {plan.priceId && (
              <button
                onClick={() => handleSubscribe(plan.priceId!)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Choisir ce plan
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
