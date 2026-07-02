import { db, type QueuedOperation } from './db';

// Helper to generate UUIDs on the client
export const generateUUID = (): string => {
  return 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};

export const enqueueOperation = async (
  operationType: 'CREATE' | 'UPDATE' | 'DELETE',
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  payload: any,
  uniqueSyncId: string
): Promise<string> => {
  const id = generateUUID();
  const operation: QueuedOperation = {
    id,
    operationType,
    endpoint,
    method,
    payload,
    timestamp: Date.now(),
    status: 'PENDING',
    uniqueSyncId,
  };

  await db.offlineQueue.put(operation);
  console.log(`[Offline Queue] Enqueued: ${method} ${endpoint}`, operation);
  return id;
};

// Optimistically update the local IndexedDB state based on the queued operation
export const applyOptimisticUpdate = async (op: Omit<QueuedOperation, 'id' | 'timestamp' | 'status'>) => {
  const { operationType, endpoint, payload, uniqueSyncId } = op;

  try {
    if (endpoint.startsWith('/rooms')) {
      if (operationType === 'CREATE') {
        await db.rooms.put({ ...payload, id: uniqueSyncId, status: payload.status || 'AVAILABLE' });
      } else if (operationType === 'UPDATE') {
        const id = endpoint.split('/')[2] || uniqueSyncId;
        await db.rooms.update(id, payload);
      } else if (operationType === 'DELETE') {
        const id = endpoint.split('/')[2];
        await db.rooms.delete(id);
      }
    } else if (endpoint.startsWith('/customers')) {
      if (operationType === 'CREATE') {
        await db.customers.put({ ...payload, id: uniqueSyncId });
      } else if (operationType === 'UPDATE') {
        const id = endpoint.split('/')[2] || uniqueSyncId;
        await db.customers.update(id, payload);
      }
    } else if (endpoint.startsWith('/bookings')) {
      if (operationType === 'CREATE') {
        await db.bookings.put({ ...payload, id: uniqueSyncId, status: 'CONFIRMED' });
      } else if (operationType === 'UPDATE') {
        const id = endpoint.split('/')[2] || uniqueSyncId;
        await db.bookings.update(id, payload);
      } else if (operationType === 'DELETE') {
        const id = endpoint.split('/')[2];
        await db.bookings.delete(id);
      }
    } else if (endpoint.startsWith('/checkins') || endpoint.startsWith('/check-in')) {
      if (operationType === 'CREATE') {
        await db.checkins.put({ ...payload, id: uniqueSyncId, status: 'ACTIVE' });
      } else if (operationType === 'UPDATE') {
        const id = endpoint.split('/')[2] || uniqueSyncId;
        await db.checkins.update(id, payload);
      }
    } else if (endpoint.startsWith('/checkouts')) {
      if (operationType === 'CREATE') {
        await db.checkouts.put({ ...payload, id: uniqueSyncId, billingStatus: 'PAID' });
      }
    } else if (endpoint.startsWith('/payments')) {
      if (operationType === 'CREATE') {
        await db.payments.put({ ...payload, id: uniqueSyncId, paymentStatus: 'SUCCESS' });
      }
    } else if (endpoint.startsWith('/inventory')) {
      if (operationType === 'CREATE') {
        await db.inventory.put({ ...payload, id: uniqueSyncId });
      } else if (operationType === 'UPDATE') {
        const id = endpoint.split('/')[2] || uniqueSyncId;
        await db.inventory.update(id, payload);
      }
    }
    console.log(`[Offline Queue] Optimistic state updated for ${endpoint}`);
  } catch (err) {
    console.error(`[Offline Queue] Failed to apply optimistic update for ${endpoint}:`, err);
  }
};
