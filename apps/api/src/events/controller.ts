import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  eventInputSchema,
  eventListSchema,
  eventViewSchema,
  idSchema,
  idempotencyKeySchema,
  publishEventSchema,
  updateEventSchema,
} from '../../../../packages/contracts/src/index.js';
import { OrganizerGuard } from '../auth/guards.js';
import type { AppRequest } from '../http.js';
import { sessionOf } from '../http.js';
import { apiSchema } from '../openapi.js';
import { Events } from './service.js';
function send<T>(result: { body: T; status: number; replayed: boolean }, response: Response) {
  response.status(result.status).setHeader('Idempotency-Replayed', String(result.replayed));
  return result.body;
}
@ApiTags('events')
@Controller('events')
export class PublicEventsController {
  constructor(@Inject(Events) private readonly events: Events) {}
  @Get()
  @ApiOperation({
    operationId: 'listPublicEvents',
    description: 'At most 100 most recently created published events.',
  })
  @ApiOkResponse({ schema: apiSchema(eventListSchema) })
  list() {
    return this.events.list();
  }
  @Get(':id')
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiOperation({ operationId: 'getPublicEvent' })
  @ApiOkResponse({ schema: apiSchema(eventViewSchema) })
  get(@Param('id') id: string) {
    return this.events.get(idSchema.parse(id));
  }
}
@ApiTags('organizer')
@ApiCookieAuth()
@UseGuards(OrganizerGuard)
@Controller('organizer/events')
export class OrganizerEventsController {
  constructor(@Inject(Events) private readonly events: Events) {}
  @Get()
  @ApiOperation({ operationId: 'listOwnedEvents' })
  @ApiOkResponse({ schema: apiSchema(eventListSchema) })
  list(@Req() request: AppRequest) {
    return this.events.list(sessionOf(request).user.id);
  }
  @Get(':id')
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiOperation({ operationId: 'getOwnedEvent' })
  @ApiOkResponse({ schema: apiSchema(eventViewSchema) })
  get(@Param('id') id: string, @Req() request: AppRequest) {
    return this.events.get(idSchema.parse(id), sessionOf(request).user.id);
  }
  @Post()
  @ApiOperation({ operationId: 'createEvent' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiBody({ schema: apiSchema(eventInputSchema) })
  @ApiCreatedResponse({ schema: apiSchema(eventViewSchema) })
  async create(
    @Body() body: unknown,
    @Headers('idempotency-key') key: unknown,
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return send(
      await this.events.create(
        sessionOf(request).user.id,
        idempotencyKeySchema.parse(key),
        eventInputSchema.parse(body),
      ),
      response,
    );
  }
  @Put(':id')
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiOperation({ operationId: 'updateDraftEvent' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiBody({ schema: apiSchema(updateEventSchema) })
  @ApiOkResponse({ schema: apiSchema(eventViewSchema) })
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('idempotency-key') key: unknown,
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return send(
      await this.events.update(
        sessionOf(request).user.id,
        idSchema.parse(id),
        idempotencyKeySchema.parse(key),
        updateEventSchema.parse(body),
      ),
      response,
    );
  }
  @Post(':id/publish')
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiOperation({ operationId: 'publishEvent' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiBody({ schema: apiSchema(publishEventSchema) })
  @ApiOkResponse({ schema: apiSchema(eventViewSchema) })
  async publish(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('idempotency-key') key: unknown,
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return send(
      await this.events.publish(
        sessionOf(request).user.id,
        idSchema.parse(id),
        idempotencyKeySchema.parse(key),
        publishEventSchema.parse(body),
      ),
      response,
    );
  }
}
