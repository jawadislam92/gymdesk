import { createZodDto } from 'nestjs-zod';
import { createPaymentSchema, paginationQuerySchema } from '@gymflow/shared';

export class CreatePaymentDto extends createZodDto(createPaymentSchema) {}
export class PaymentListQueryDto extends createZodDto(paginationQuerySchema) {}
