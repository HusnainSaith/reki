import { Controller, Get, Sse, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Observable, concat, defer, interval, map, merge } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards';
import { LiveGateway } from './live.gateway';
import { LiveService } from './live.service';

interface MessageEvent {
  data: string | object;
  type?: string;
}

@ApiTags('Live')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT missing or invalid' })
@Controller('live')
@UseGuards(JwtAuthGuard)
export class LiveController {
  constructor(
    private readonly liveGateway: LiveGateway,
    private readonly liveService: LiveService,
  ) {}

  @Get('snapshot')
  @ApiOperation({ summary: 'Get the current city live feed snapshot' })
  @ApiQuery({ name: 'city', required: false, example: 'manchester' })
  async snapshot(@Query('city') city?: string) {
    return this.liveService.getSnapshot(city || 'manchester');
  }

  @Sse('feed')
  @ApiOperation({ summary: 'SSE fallback: live feed updates (heartbeat every 30s)' })
  @ApiQuery({ name: 'city', required: false, example: 'manchester' })
  @ApiOkResponse({ description: 'SSE stream (text/event-stream) of live feed heartbeats' })
  feedStream(@Query('city') city?: string): Observable<MessageEvent> {
    const normalizedCity = (city || 'manchester').trim().toLowerCase();
    const initial = defer(() => this.liveService.getSnapshot(normalizedCity)).pipe(
      map((snapshot) => ({ data: JSON.stringify({ type: 'snapshot', ...snapshot }) })),
    );
    const events = this.liveGateway.eventsForCity(normalizedCity).pipe(
      map((event) => ({ data: JSON.stringify(event) })),
    );
    const heartbeats = interval(30000).pipe(
      map(() => ({
        data: JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
          city: normalizedCity,
        }),
      })),
    );
    return concat(initial, merge(events, heartbeats));
  }

  @Sse('venue/:venueId')
  @ApiOperation({ summary: 'SSE fallback: live venue detail updates' })
  @ApiParam({ name: 'venueId', description: 'Venue UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'SSE stream of venue heartbeats with viewer count' })
  venueStream(@Param('venueId') venueId: string): Observable<MessageEvent> {
    return interval(30000).pipe(
      map(() => ({
        data: JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
          venueId,
          currentlyViewing: this.liveGateway.getVenueViewerCount(venueId),
        }),
      })),
    );
  }

  @Sse('map')
  @ApiOperation({ summary: 'SSE fallback: live map marker updates' })
  @ApiQuery({ name: 'city', required: false, example: 'manchester' })
  @ApiOkResponse({ description: 'SSE stream of map-wide heartbeats' })
  mapStream(@Query('city') city?: string): Observable<MessageEvent> {
    return interval(30000).pipe(
      map(() => ({
        data: JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
          city: city || 'manchester',
        }),
      })),
    );
  }
}
