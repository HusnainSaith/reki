import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { BadRequestException } from '@nestjs/common';

describe('UploadController', () => {
  let controller: UploadController;
  let service: Partial<UploadService>;

  const mockResult = {
    url: 'https://reki-uploads.s3.eu-west-2.amazonaws.com/images/uuid.jpg',
    key: 'images/uuid.jpg',
  };

  const makeFile = (): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'photo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('data'),
    size: 1024,
    stream: null,
    destination: '',
    filename: '',
    path: '',
  });

  beforeEach(() => {
    service = {
      uploadImage: jest.fn().mockResolvedValue(mockResult),
    };
    controller = new UploadController(service as UploadService);
  });

  describe('uploadImage', () => {
    it('should call service with folder "images" and return url + key', async () => {
      const file = makeFile();
      const result = await controller.uploadImage(file);

      expect(service.uploadImage).toHaveBeenCalledWith(file, 'images');
      expect(result.url).toBe(mockResult.url);
      expect(result.key).toBe(mockResult.key);
    });

    it('should throw BadRequestException when no file sent', async () => {
      await expect(controller.uploadImage(undefined)).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadVenueImage', () => {
    it('should call service with folder "venues" and return url + key', async () => {
      const file = makeFile();
      const venueResult = {
        url: 'https://reki-uploads.s3.eu-west-2.amazonaws.com/venues/uuid.jpg',
        key: 'venues/uuid.jpg',
      };
      (service.uploadImage as jest.Mock).mockResolvedValue(venueResult);

      const result = await controller.uploadVenueImage(file);

      expect(service.uploadImage).toHaveBeenCalledWith(file, 'venues');
      expect(result.url).toContain('/venues/');
    });

    it('should throw BadRequestException when no file sent', async () => {
      await expect(controller.uploadVenueImage(undefined)).rejects.toThrow(BadRequestException);
    });
  });
});
