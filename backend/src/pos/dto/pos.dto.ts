import { createZodDto } from 'nestjs-zod';
import { createProductSchema, sellSchema, updateProductSchema } from '@gymflow/shared';

export class CreateProductDto extends createZodDto(createProductSchema) {}
export class UpdateProductDto extends createZodDto(updateProductSchema) {}
export class SellDto extends createZodDto(sellSchema) {}
