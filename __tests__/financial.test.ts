import { formatPaise, paiseToRupees, rupeesToPaise } from '../src/lib/currency';

describe('Financial Utilities & Math', () => {
  test('converts rupees to paise accurately', () => {
    expect(rupeesToPaise(60)).toBe(6000);
    expect(rupeesToPaise('60')).toBe(6000);
    expect(rupeesToPaise(120)).toBe(12000);
    expect(rupeesToPaise('120.50')).toBe(12050);
    expect(rupeesToPaise(0)).toBe(0);
    expect(rupeesToPaise(-10)).toBe(0);
  });

  test('converts paise to rupees accurately', () => {
    expect(paiseToRupees(6000)).toBe(60);
    expect(paiseToRupees(12000)).toBe(120);
    expect(paiseToRupees(12050)).toBe(120.5);
    expect(paiseToRupees(0)).toBe(0);
  });

  test('formats paise into Indian Rupee string representation', () => {
    expect(formatPaise(6000)).toBe('₹60');
    expect(formatPaise(12000)).toBe('₹120');
    expect(formatPaise(12050)).toBe('₹120.50');
    expect(formatPaise(500000)).toBe('₹5,000');
    expect(formatPaise(0)).toBe('₹0');
  });

  test('FIFO allocation algorithm logic matches payment needs', () => {
    // Scenario from problem statement:
    // 1 Nov: Morning + Evening = ₹120 (12000 paise)
    // 2 Nov: Morning + Evening = ₹120 (12000 paise)
    // 3 Nov: Morning only = ₹60 (6000 paise)
    // 5 Nov: Morning + Evening = ₹120 (12000 paise)
    // Total = ₹420 (42000 paise)

    const trips = [
      { id: 't1', fare_paise: 6000, already_allocated: 0 },
      { id: 't2', fare_paise: 6000, already_allocated: 0 },
      { id: 't3', fare_paise: 6000, already_allocated: 0 },
      { id: 't4', fare_paise: 6000, already_allocated: 0 },
      { id: 't5', fare_paise: 6000, already_allocated: 0 },
      { id: 't6', fare_paise: 6000, already_allocated: 0 },
      { id: 't7', fare_paise: 6000, already_allocated: 0 },
    ];

    let paymentAmount = 42000;
    const allocations: { tripId: string; amount: number }[] = [];

    for (const trip of trips) {
      if (paymentAmount <= 0) break;
      const needed = trip.fare_paise - trip.already_allocated;
      const alloc = Math.min(paymentAmount, needed);
      allocations.push({ tripId: trip.id, amount: alloc });
      paymentAmount -= alloc;
    }

    expect(paymentAmount).toBe(0);
    expect(allocations.length).toBe(7);
    expect(allocations.reduce((sum, a) => sum + a.amount, 0)).toBe(42000);
  });

  test('Partial payment allocation leaves remaining balance correctly', () => {
    const trips = [
      { id: 't1', fare_paise: 6000, already_allocated: 0 },
      { id: 't2', fare_paise: 6000, already_allocated: 0 },
    ];

    let paymentAmount = 10000; // ₹100 for ₹120 total
    const allocations: { tripId: string; amount: number }[] = [];

    for (const trip of trips) {
      if (paymentAmount <= 0) break;
      const needed = trip.fare_paise - trip.already_allocated;
      const alloc = Math.min(paymentAmount, needed);
      allocations.push({ tripId: trip.id, amount: alloc });
      paymentAmount -= alloc;
    }

    expect(allocations).toEqual([
      { tripId: 't1', amount: 6000 },
      { tripId: 't2', amount: 4000 },
    ]);

    const remainingTrip2 = trips[1].fare_paise - 4000;
    expect(remainingTrip2).toBe(2000); // ₹20 remaining
  });
});

