import { createZodDto } from 'nestjs-zod';
import { broadcastNotificationSchema } from '@gymflow/shared';

export class BroadcastNotificationDto extends createZodDto(broadcastNotificationSchema) {}
