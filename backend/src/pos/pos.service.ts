import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateProductInput, SellInput, UpdateProductInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay } from '../common/date';

@Injectable()
export class PosService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(gymId: string, includeInactive = false) {
    const rows = await this.prisma.product.findMany({
      where: { gymId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      stock: p.stock,
      isActive: p.isActive,
    }));
  }

  createProduct(gymId: string, dto: CreateProductInput) {
    return this.prisma.product.create({
      data: {
        gymId,
        name: dto.name,
        price: dto.price,
        stock: dto.stock ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateProduct(gymId: string, id: string, dto: UpdateProductInput) {
    const product = await this.prisma.product.findFirst({ where: { id, gymId } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.product.update({
      where: { id },
      data: { name: dto.name, price: dto.price, stock: dto.stock, isActive: dto.isActive },
    });
  }

  async archiveProduct(gymId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, gymId } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  async sell(gymId: string, dto: SellInput, soldById?: string) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, gymId } });
    if (!product) throw new NotFoundException('Product not found');
    const quantity = dto.quantity ?? 1;
    if (product.stock < quantity) throw new ConflictException('Not enough stock');

    const unitPrice = Number(product.price);
    const total = unitPrice * quantity;

    const [sale] = await this.prisma.$transaction([
      this.prisma.sale.create({
        data: {
          gymId,
          productId: product.id,
          productName: product.name,
          quantity,
          unitPrice,
          total,
          method: dto.method ?? 'cash',
          soldById: soldById ?? null,
        },
      }),
      this.prisma.product.update({ where: { id: product.id }, data: { stock: { decrement: quantity } } }),
    ]);
    return { id: sale.id, productName: sale.productName, quantity, total, method: sale.method };
  }

  async recentSales(gymId: string) {
    const rows = await this.prisma.sale.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const todaySum = await this.prisma.sale.aggregate({
      _sum: { total: true },
      where: { gymId, createdAt: { gte: startOfDay() } },
    });
    return {
      sales: rows.map((s) => ({
        id: s.id,
        productName: s.productName,
        quantity: s.quantity,
        total: Number(s.total),
        method: s.method,
        createdAt: s.createdAt,
      })),
      todayTotal: Number(todaySum._sum.total ?? 0),
    };
  }
}
