import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { UUID } from 'crypto';
import { OrderPaginationDto } from 'src/common/dto/pagination.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern({ cmd: 'create-order' })
  async create(@Payload() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);
    const paymentSession = await this.ordersService.createPaymentSession(order);
    return {
      order,
      paymentSession,
    };
  }

  @MessagePattern({ cmd: 'find-all-orders' })
  findAll(@Payload() orderPaginationDto: OrderPaginationDto) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern({ cmd: 'find-one-order' })
  findOne(@Payload() id: UUID) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern({ cmd: 'change-order-status' })
  changeOrderStatus(@Payload() changeOrderStatusDto: ChangeOrderStatusDto) {
    return this.ordersService.updateStatus(
      changeOrderStatusDto.id,
      changeOrderStatusDto.status,
    );
  }

  @EventPattern({ cmd: 'payment.succeeded' })
  paidOrder(@Payload() paidOrderDto: any) {
    this.ordersService.paidOrder(paidOrderDto);
  }
}
