import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthUser } from '../auth/types/auth-user';
import { PosService } from './pos.service';
import { CreateProductDto, SellDto, UpdateProductDto } from './dto/pos.dto';

@ApiTags('pos')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.PAYMENTS_COLLECT)
@Controller('pos')
export class PosController {
  constructor(private readonly pos: PosService) {}

  @Get('products')
  products(@GymId() gymId: string) {
    return this.pos.listProducts(gymId, true);
  }

  @Post('products')
  createProduct(@GymId() gymId: string, @Body() dto: CreateProductDto) {
    return this.pos.createProduct(gymId, dto);
  }

  @Patch('products/:id')
  updateProduct(@GymId() gymId: string, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.pos.updateProduct(gymId, id, dto);
  }

  @Delete('products/:id')
  archiveProduct(@GymId() gymId: string, @Param('id') id: string) {
    return this.pos.archiveProduct(gymId, id);
  }

  @Post('sell')
  sell(@GymId() gymId: string, @Body() dto: SellDto, @CurrentUser() u: AuthUser) {
    return this.pos.sell(gymId, dto, u.sub);
  }

  @Get('sales')
  sales(@GymId() gymId: string) {
    return this.pos.recentSales(gymId);
  }
}
