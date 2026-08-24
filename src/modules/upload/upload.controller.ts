import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards';
import { BusinessGuard } from '../../common/guards';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Generic image upload — any authenticated user (regular user or business)
   * Use this for: profile pictures, user-generated content
   */
  @Post('image')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload an image — returns S3 URL' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (jpg, jpeg, png, webp — max 5MB)',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Image uploaded successfully',
    schema: {
      example: {
        url: 'https://reki-bucket.s3.eu-west-2.amazonaws.com/images/abc-uuid.jpg',
        key: 'images/abc-uuid.jpg',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'JWT missing or invalid' })
  @ApiBadRequestResponse({ description: 'Invalid file type or file too large' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided. Send file in "file" field');
    }
    return this.uploadService.uploadImage(file, 'images');
  }

  /**
   * Venue image upload — business users only
   * Use this for: venue photos sent in POST /business/venues or PUT /business/venues/:id
   */
  @Post('venue-image')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a venue image (business only) — returns S3 URL' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Venue image (jpg, jpeg, png, webp — max 5MB)',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Venue image uploaded successfully',
    schema: {
      example: {
        url: 'https://reki-bucket.s3.eu-west-2.amazonaws.com/venues/abc-uuid.jpg',
        key: 'venues/abc-uuid.jpg',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'JWT missing or invalid' })
  @ApiBadRequestResponse({ description: 'Invalid file type or file too large' })
  async uploadVenueImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided. Send file in "file" field');
    }
    return this.uploadService.uploadImage(file, 'venues');
  }
}
