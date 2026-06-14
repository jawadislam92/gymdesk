import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { NotificationsService } from './notifications.service';
import { BroadcastNotificationDto } from './dto/notifications.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.MEMBERS_MANAGE)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@GymId() gymId: string) {
    return this.notifications.listGym(gymId);
  }

  @Post('broadcast')
  broadcast(@GymId() gymId: string, @Body() dto: BroadcastNotificationDto) {
    return this.notifications.broadcast(gymId, dto);
  }
}
