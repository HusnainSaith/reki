import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusynessLevel, BusynessPercentageMap, BusinessRole } from '../../common/enums';
import { BusinessUser } from '../business/entities/business-user.entity';
import { VenueAssignment } from '../business/entities/venue-assignment.entity';
import { Venue } from '../venues/entities/venue.entity';
import { Busyness } from '../busyness/entities/busyness.entity';
import { LiveGateway } from '../live/live.gateway';

@Injectable()
export class WorkerService {
  constructor(
    @InjectRepository(BusinessUser)
    private readonly businessUsersRepository: Repository<BusinessUser>,
    @InjectRepository(VenueAssignment)
    private readonly assignmentsRepository: Repository<VenueAssignment>,
    @InjectRepository(Venue)
    private readonly venuesRepository: Repository<Venue>,
    @InjectRepository(Busyness)
    private readonly busynessRepository: Repository<Busyness>,
    private readonly liveGateway: LiveGateway,
  ) {}

  async getAssignedVenues(businessUserId: string) {
    const businessUser = await this.businessUsersRepository.findOne({ where: { id: businessUserId } });
    if (!businessUser || !businessUser.isActive || !businessUser.isApproved) {
      throw new ForbiddenException('Business account is not active');
    }

    if (businessUser.role === BusinessRole.OWNER || businessUser.role === BusinessRole.MANAGER) {
      return this.venuesRepository.find({
        where: { businessUserId },
        order: { name: 'ASC' },
      });
    }

    const assignments = await this.assignmentsRepository.find({
      where: { businessUserId, isActive: true },
      relations: ['venue'],
    });
    return assignments
      .map((assignment) => assignment.venue)
      .filter((venue) => venue && venue.businessUserId === businessUserId);
  }

  async assertVenueAccess(businessUserId: string, venueId: string) {
    const venues = await this.getAssignedVenues(businessUserId);
    const venue = venues.find((candidate) => candidate.id === venueId);
    if (!venue) {
      throw new ForbiddenException('You are not assigned to this venue');
    }
    return venue;
  }

  async getBusinessUser(businessUserId: string) {
    const businessUser = await this.businessUsersRepository.findOne({ where: { id: businessUserId } });
    if (!businessUser || !businessUser.isActive || !businessUser.isApproved) {
      throw new ForbiddenException('Business account is not active');
    }
    return businessUser;
  }

  async assignVenue(actorId: string, venueId: string, assignedUserId: string) {
    const actor = await this.getBusinessUser(actorId);
    if (actor.role !== BusinessRole.OWNER && actor.role !== BusinessRole.MANAGER) {
      throw new ForbiddenException('Only owners and managers can manage venue assignments');
    }

    const venue = await this.venuesRepository.findOne({ where: { id: venueId, businessUserId: actorId } });
    if (!venue) throw new NotFoundException('Venue not found for this business');

    const assignedUser = await this.businessUsersRepository.findOne({ where: { id: assignedUserId } });
    if (!assignedUser || !assignedUser.isActive || assignedUser.role !== BusinessRole.STAFF) {
      throw new NotFoundException('Active staff user not found');
    }

    const existing = await this.assignmentsRepository.findOne({ where: { businessUserId: assignedUserId, venueId } });
    if (existing?.isActive) throw new ConflictException('Staff user is already assigned to this venue');

    const assignment = existing || this.assignmentsRepository.create({ businessUserId: assignedUserId, venueId });
    assignment.isActive = true;
    return this.assignmentsRepository.save(assignment);
  }

  async removeVenueAssignment(actorId: string, venueId: string, assignedUserId: string) {
    const actor = await this.getBusinessUser(actorId);
    if (actor.role !== BusinessRole.OWNER && actor.role !== BusinessRole.MANAGER) {
      throw new ForbiddenException('Only owners and managers can manage venue assignments');
    }

    const venue = await this.venuesRepository.findOne({ where: { id: venueId, businessUserId: actorId } });
    if (!venue) throw new NotFoundException('Venue not found for this business');

    const assignment = await this.assignmentsRepository.findOne({ where: { businessUserId: assignedUserId, venueId } });
    if (!assignment) throw new NotFoundException('Venue assignment not found');

    assignment.isActive = false;
    await this.assignmentsRepository.save(assignment);
    return { success: true };
  }

  async updateVenueStatus(businessUserId: string, venueId: string, level: BusynessLevel) {
    const venue = await this.assertVenueAccess(businessUserId, venueId);
    const percentage = BusynessPercentageMap[level];
    let busyness = await this.busynessRepository.findOne({ where: { venueId } });
    if (!busyness) busyness = this.busynessRepository.create({ venueId });
    busyness.level = level;
    busyness.percentage = percentage;
    busyness.updatedBy = businessUserId;
    await this.busynessRepository.save(busyness);

    this.liveGateway.broadcastBusynessUpdate(venue.city.toLowerCase(), venueId, {
      level,
      percentage,
      ragColor: percentage >= 67 ? 'red' : percentage >= 34 ? 'amber' : 'green',
    });
    return { success: true, venueId, busyness: { level, percentage } };
  }
}
