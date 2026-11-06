export type CommuteType = 'carpool' | 'own_vehicle' | 'leave' | 'other';
export type TripType = 'morning' | 'evening';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type PaymentMethod = 'upi' | 'cash' | 'bank_transfer' | 'other';

export type CarpoolOwner = {
  id: string;
  name: string;
  phone?: string | null;
  default_morning_fare_paise: number;
  default_evening_fare_paise: number;
  notes?: string | null;
  is_active: number; // 1 = active, 0 = archived
  created_at: string;
  updated_at: string;
};

export type OwnerSummary = {
  total_trips: number;
  unpaid_trips_count: number;
  total_charges_paise: number;
  total_paid_paise: number;
  outstanding_balance_paise: number;
  last_payment_date?: string | null;
} & CarpoolOwner;

export type CommuteDay = {
  id: string;
  date: string; // YYYY-MM-DD
  commute_type: CommuteType;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type CommuteTrip = {
  id: string;
  commute_day_id: string;
  owner_id?: string | null;
  trip_type: TripType;
  fare_paise: number;
  created_at: string;
  updated_at: string;
};

export type CommuteTripDetail = {
  owner_name?: string | null;
  allocated_paise: number;
  remaining_paise: number;
  payment_status: PaymentStatus;
} & CommuteTrip;

export type CommuteDayWithTrips = {
  trips: CommuteTripDetail[];
  total_fare_paise: number;
  total_allocated_paise: number;
  payment_status: PaymentStatus;
} & CommuteDay;

export type Payment = {
  id: string;
  owner_id: string;
  amount_paise: number;
  payment_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentDetail = {
  owner_name: string;
  allocated_paise: number;
  allocations_count: number;
} & Payment;

export type PaymentAllocation = {
  id: string;
  payment_id: string;
  commute_trip_id: string;
  allocated_amount_paise: number;
  created_at: string;
};

export type AppSettings = {
  id: string;
  reminder_enabled: boolean;
  reminder_hour: number;
  reminder_minute: number;
  secondary_reminder_enabled: boolean;
  secondary_reminder_hour: number;
  secondary_reminder_minute: number;
  default_owner_id?: string | null;
  theme: 'system' | 'light' | 'dark';
  currency: string;
  currency_symbol: string;
  working_days: number[]; // [1, 2, 3, 4, 5] for Mon-Fri
};

export type AuditLog = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'settle';
  previous_data?: string | null;
  updated_data?: string | null;
  created_at: string;
};

export type DashboardStats = {
  today_status: CommuteType | 'not_logged';
  today_expense_paise: number;
  today_trips_count: number;
  total_outstanding_paise: number;
  month_expense_paise: number;
  month_paid_paise: number;
  month_carpool_days: number;
  month_own_vehicle_days: number;
  month_leave_days: number;
  unlogged_past_days_count: number;
  owners: OwnerSummary[];
  recent_commutes: CommuteDayWithTrips[];
};

export type MonthAnalytics = {
  total_carpool_expense_paise: number;
  total_year_expense_paise: number;
  avg_daily_expense_paise: number;
  total_paid_paise: number;
  total_outstanding_paise: number;
  carpool_days: number;
  own_vehicle_days: number;
  leave_days: number;
  morning_expense_paise: number;
  evening_expense_paise: number;
  most_frequent_owner_name?: string | null;
  owner_distribution: {
    owner_id: string;
    owner_name: string;
    total_trips: number;
    total_fare_paise: number;
  }[];
  daily_trend: {
    date: string;
    fare_paise: number;
    commute_type: CommuteType;
  }[];
};
