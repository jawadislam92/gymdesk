import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AiService } from './ai.service';
import { AiChatDto } from './ai.dto';

// No authentication — this powers the AI receptionist on the public per-gym page.
@ApiTags('public')
@Public()
@Controller('public/gyms/:slug/ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('status')
  status(@Param('slug') slug: string) {
    return this.ai.status(slug);
  }

  @Post('chat')
  @HttpCode(200)
  chat(@Param('slug') slug: string, @Body() dto: AiChatDto) {
    return this.ai.chat(slug, dto.messages);
  }
}
