import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderStatus, PrismaClient } from '@prisma/client';
import { UUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { OrderPaginationDto } from 'src/common/dto/pagination.dto';
import { NATS_SERVICE } from 'src/config/services';
import { Product } from 'src/orders/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');
  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }
  async create(createOrderDto: CreateOrderDto) {
    try {
      const ids = createOrderDto.items.map((item) => item.productId);
      const products: Product[] = await firstValueFrom(
        this.client.send({ cmd: 'validate-products' }, ids),
      );
      const totalAmount = createOrderDto.items.reduce((acc, product) => {
        const price = products.find((p) => p.id === product.productId).price;
        return price * product.quantity;
      }, 0);
      const totalItems = createOrderDto.items.reduce((acc, product) => {
        return acc + product.quantity;
      }, 0);
      const createManyOrderItemData = createOrderDto.items.map((item) => {
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: products.find((p) => p.id === item.productId).price,
        };
      });
      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany: {
              data: createManyOrderItemData,
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });
      const orderResponse = {
        ...order,
        OrderItem: order.OrderItem.map((item) => {
          return {
            ...item,
            name: products.find((p) => p.id === item.productId).name,
          };
        }),
      };
      return orderResponse;
    } catch (error) {
      this.logger.error(`CREATE_ERROR: ${error.message}`);
      if (error.message.includes('SOME_PRODUCTS_NOT_FOUND')) {
        throw new RpcException({
          message: `CREATE_ORDER_ERROR: ${error.message}`,
          status: HttpStatus.BAD_REQUEST,
        });
      }
      throw new RpcException({
        message: 'CREATE_ORDER_ERROR',
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  async findAll(paginationDto: OrderPaginationDto) {
    const { page, limit, status } = paginationDto;
    const totalPages = await this.order.count({
      where: {
        available: true,
        status: {
          equals: status,
        },
      },
    });
    const lastPage = Math.ceil(totalPages / limit);
    const where = status
      ? {
          available: true,
          status: {
            equals: status,
          },
        }
      : {
          available: true,
        };
    const data = await this.order.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where,
    });
    const meta = {
      total: totalPages,
      page: page,
      lastPage: lastPage,
    };
    const result = {
      data,
      metadata: meta,
    };
    return { result };
  }

  async findOne(id: UUID) {
    try {
      const order = await this.order.findFirst({
        where: { id, available: true },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });
      if (!order) {
        throw new RpcException({
          message: `ORDER_NOT_FOUND_ID: ${id}`,
          status: HttpStatus.NOT_FOUND,
        });
      }
      const ids = order.OrderItem.map((item) => item.productId);
      const products: Product[] = await firstValueFrom(
        this.client.send({ cmd: 'validate-products' }, ids),
      );
      const orderResponse = {
        ...order,
        OrderItem: order.OrderItem.map((item) => {
          return {
            ...item,
            name: products.find((p) => p.id === item.productId).name,
          };
        }),
      };
      return orderResponse;
    } catch (error) {
      this.logger.error(`FIND_ONE_ERROR_ID: ${id}`);
      throw new RpcException({
        message: `ORDER_NOT_FOUND_ID : ${id}`,
        status: HttpStatus.NOT_FOUND,
      });
    }
  }

  async updateStatus(id: UUID, newStatus: OrderStatus) {
    try {
      const order = await this.order.update({
        where: { id },
        data: { status: newStatus },
      });
      if (!order) {
        throw new RpcException({
          message: `ORDER_NOT_FOUND_ID: ${id}`,
          status: HttpStatus.NOT_FOUND,
        });
      }
      return order;
    } catch (error) {
      this.logger.error(`UPDATE_STATUS_ERROR_ID: ${id}`);
      throw new RpcException({
        message: `UPDATE_STATUS_ERROR_ID: ${id}`,
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }
}
