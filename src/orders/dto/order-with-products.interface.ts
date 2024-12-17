import { OrderStatus } from '@prisma/client';

export interface IOrderWithProducts {
  OrderItem: {
    name: string;
    productId: number;
    quantity: number;
    price: number;
  }[];
  id: string;
  totalAmount: number;
  totalItems: number;
  status: OrderStatus;
  paid: boolean;
  paidAt: Date | null;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}
