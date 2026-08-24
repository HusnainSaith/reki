import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

const s3Mock = mockClient(S3Client);

describe('UploadService', () => {
  let service: UploadService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'app.s3.region': 'eu-west-2',
        'app.s3.bucket': 'reki-uploads',
        'app.s3.accessKeyId': 'test-key',
        'app.s3.secretAccessKey': 'test-secret',
        'app.s3.maxFileSizeMb': 5,
      };
      return config[key];
    }),
  };

  const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image-data'),
    size: 1024,
    stream: null,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  });

  beforeEach(async () => {
    s3Mock.reset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  describe('uploadImage', () => {
    it('should upload a valid jpg and return url and key', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const file = makeFile();
      const result = await service.uploadImage(file, 'images');

      expect(result.url).toMatch(/^https:\/\/reki-uploads\.s3\.eu-west-2\.amazonaws\.com\/images\//);
      expect(result.key).toMatch(/^images\/.+\.jpg$/);
    });

    it('should upload to correct folder', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const file = makeFile({ originalname: 'venue.png', mimetype: 'image/png' });
      const result = await service.uploadImage(file, 'venues');

      expect(result.key).toMatch(/^venues\/.+\.png$/);
      expect(result.url).toContain('/venues/');
    });

    it('should accept webp files', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const file = makeFile({ originalname: 'photo.webp', mimetype: 'image/webp' });
      const result = await service.uploadImage(file, 'images');

      expect(result.key).toMatch(/\.webp$/);
    });

    it('should throw BadRequestException for invalid mime type', async () => {
      const file = makeFile({ mimetype: 'image/gif', originalname: 'anim.gif' });

      await expect(service.uploadImage(file)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-image file', async () => {
      const file = makeFile({ mimetype: 'application/pdf', originalname: 'doc.pdf' });

      await expect(service.uploadImage(file)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file exceeds 5MB', async () => {
      const file = makeFile({ size: 6 * 1024 * 1024 }); // 6MB

      await expect(service.uploadImage(file)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(service.uploadImage(null)).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException when S3 fails', async () => {
      s3Mock.on(PutObjectCommand).rejects(new Error('S3 network error'));

      const file = makeFile();
      await expect(service.uploadImage(file)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('deleteImage', () => {
    it('should delete image by key', async () => {
      s3Mock.on(DeleteObjectCommand).resolves({});

      await expect(service.deleteImage('images/some-uuid.jpg')).resolves.not.toThrow();
    });

    it('should throw InternalServerErrorException when S3 delete fails', async () => {
      s3Mock.on(DeleteObjectCommand).rejects(new Error('S3 delete error'));

      await expect(service.deleteImage('images/missing.jpg')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
