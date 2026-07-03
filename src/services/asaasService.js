// Configuração e mock para integração com a API do Asaas

const ASAAS_API_URL = import.meta.env.VITE_ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = import.meta.env.VITE_ASAAS_API_KEY || '';

/**
 * Fetch payments from Asaas API.
 * Currently returns mock data since there's no real backend/API key configured yet.
 */
export const fetchAsaasPayments = async () => {
  // Configuração real (comentada para demonstração):
  /*
  const response = await fetch(`${ASAAS_API_URL}/payments`, {
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  return await response.json();
  */

  // Retornando mock
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: [
          { id: 'pay_123', value: 5000, status: 'RECEIVED', dueDate: '2026-03-15' },
          { id: 'pay_124', value: 2500, status: 'PENDING', dueDate: '2026-03-20' },
        ]
      });
    }, 1000);
  });
};

/**
 * Create a new payment/charge in Asaas
 */
export const createAsaasPayment = async (customer, billingType, value, dueDate) => {
    // Implementar a chamada real:
    // ...
    return Promise.resolve({ success: true, id: 'pay_new_mock' });
};
