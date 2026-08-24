import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiBody,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { VibesService } from './vibes.service';
import { SubmitVibeCheckDto } from './dto/submit-vibe-check.dto';
import { JwtAuthGuard } from '../auth/guards';
import { NoGuestGuard } from '../../common/guards';

@ApiTags('Vibes')
@Controller('venues')
export class VibesController {
  constructor(private readonly vibesService: VibesService) {}

  @Post(':venueId/vibe-check')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a vibe check (1-5) for a venue; updates running average' })
  @ApiParam({ name: 'venueId', description: 'Venue UUID', format: 'uuid' })
  @ApiBody({ type: SubmitVibeCheckDto })
  @ApiCreatedResponse({ description: 'Vibe check recorded — returns new average + response count' })
  @ApiBadRequestResponse({ description: 'Score must be between 1 and 5' })
  @ApiUnauthorizedResponse({ description: 'JWT missing or invalid' })
  @ApiForbiddenResponse({ description: 'Guest users cannot submit vibe checks' })
  async submitVibeCheck(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() dto: SubmitVibeCheckDto,
  ) {
    const vibe = await this.vibesService.submitVibeCheck(venueId, dto.score);
    return {
      success: true,
      vibeCheckScore: Number(vibe.vibeCheckScore),
      responseCount: vibe.responseCount,
    };
  }
}
