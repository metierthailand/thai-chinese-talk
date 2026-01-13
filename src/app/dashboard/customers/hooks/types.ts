// Types for customer detail page transformations

export interface RawTask {
  id: string;
  title: string;
  dueDate: string | Date;
  isCompleted: boolean;
  priority: string | number;
}

export interface ClientTask {
  id: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
  priority: string;
}

export interface RawBooking {
  id: string;
  status: string;
  totalAmount: string | number;
  trip: {
    name: string;
    startDate: string | Date;
    endDate: string | Date;
  };
}

export interface ClientBooking {
  id: string;
  status: string;
  totalAmount: string;
  trip: {
    name: string;
    startDate: Date;
    endDate: Date;
  };
}

export interface RawPassport {
  id: string;
  customerId: string;
  passportNumber: string;
  issuingCountry: string;
  expiryDate: Date | string;
  isPrimary: boolean;
}

export interface ClientPassport {
  id: string;
  customerId: string;
  passportNumber: string;
  issuingCountry: string;
  expiryDate: Date;
  isPrimary: boolean;
}

export interface ClientLead {
  id: string;
  destinationInterest: string | null;
  status: string;
}

export interface Passport {
  id: string;
  customerId: string;
  passportNumber: string;
  issuingCountry: string;
  issuingDate: string; // ISO date string from API
  expiryDate: string; // ISO date string from API
  imageUrl?: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}
