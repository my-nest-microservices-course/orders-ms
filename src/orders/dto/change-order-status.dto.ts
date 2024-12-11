import { OrderStatus } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';
import { UUID } from 'crypto';
import { OrderStatusList } from '../enum/order.enum';

export class ChangeOrderStatusDto {
  @IsUUID()
  id: UUID;
  @IsEnum(OrderStatusList, {
    message: `Posible status values are ${OrderStatusList.join(', ')}`,
  })
  status: OrderStatus;
}
