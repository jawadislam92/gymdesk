import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PublicService } from './public.service';
import { CreateLeadDto } from '../leads/dto/leads.dto';

// No authentication — these power the public per-gym page (schedule + "join").
@ApiTags('public')
@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly pub: PublicService) {}

  @Get('gyms/:slug')
  gym(@Param('slug') slug: string) {
    return this.pub.gymPage(slug);
  }

  @Post('gyms/:slug/leads')
  @HttpCode(201)
  lead(@Param('slug') slug: string, @Body() dto: CreateLeadDto) {
    return this.pub.submitLead(slug, dto);
  }

  @Post('checkin/:token')
  @HttpCode(200)
  checkin(@Param('token') token: string) {
    return this.pub.checkIn(token);
  }
}
