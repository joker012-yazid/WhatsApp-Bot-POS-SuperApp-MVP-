import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import { PosService } from './pos.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RefundSaleDto } from './dto/refund-sale.dto';
import { PrintSaleDto } from './dto/print-sale.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('products')
  listProducts(@Query('branchId') branchId?: string) {
    return this.posService.listProducts(branchId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.posService.createProduct(dto);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Put('products/:id')
  updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: any
  ) {
    return this.posService.updateProduct(id, dto, user?.userId);
  }

  @Roles(Role.ADMIN)
  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.posService.deleteProduct(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  @Post('sales')
  createSale(@Body() dto: CreateSaleDto, @CurrentUser() user: any) {
    return this.posService.createSale(dto, user?.userId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('sales/:id/refund')
  refundSale(@Param('id') id: string, @Body() body: Omit<RefundSaleDto, 'saleId'>, @CurrentUser() user: any) {
    return this.posService.refundSale({ ...body, saleId: id }, user?.userId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('sales/export')
  exportSales(@Query('branchId') branchId: string | undefined, @CurrentUser() user: any) {
    return this.posService.exportSales(branchId, user?.userId);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  @Post('print/:saleId')
  printSale(@Param('saleId') saleId: string, @Body() dto: PrintSaleDto) {
    return this.posService.printSale(saleId, dto);
  }
}
