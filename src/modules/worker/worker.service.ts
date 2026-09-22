import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusynessLevel, BusynessPercentageMap, BusinessRole } from '../../common/enums';
import { BusinessUser } from '../business/entities/business-user.entity';
import { VenueAssignment } from '../business/entities/venue-assignment.entity';
import { Venue } from '../venues/entities/venue.entity';
import { Busyness } from '../busyness/entities/busyness.entity';
import { LiveGateway } from '../live/live.gateway';
import { VenueLiveUpdate } from './entities/venue-live-update.entity';
import * as bcrypt from 'bcrypt';

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
    @InjectRepository(VenueLiveUpdate)
    private readonly liveUpdatesRepository: Repository<VenueLiveUpdate>,
    private readonly liveGateway: LiveGateway,
  ) {}

  async getAssignedVenues(businessUserId: string) {
    const businessUser = await this.businessUsersRepository.findOne({ where: { id: businessUserId } });
    if (!businessUser || !businessUser.isActive || !businessUser.isApproved) {
      throw new ForbiddenException('Business account is not active');
    }

    if (businessUser.role === BusinessRole.OWNER) {
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
      .filter(Boolean);
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

    const ownerId = actor.role === BusinessRole.OWNER ? actor.id : actor.accountOwnerId;
    const venue = await this.venuesRepository.findOne({ where: { id: venueId, businessUserId: ownerId } });
    if (!venue) throw new NotFoundException('Venue not found for this business');

    const assignedUser = await this.businessUsersRepository.findOne({ where: { id: assignedUserId } });
    if (!assignedUser || !assignedUser.isActive || assignedUser.role !== BusinessRole.STAFF) {
      throw new NotFoundException('Active staff user not found');
    }
    if (assignedUser.accountOwnerId !== ownerId) {
      throw new ForbiddenException('Staff user does not belong to this business');
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

    const ownerId = actor.role === BusinessRole.OWNER ? actor.id : actor.accountOwnerId;
    const venue = await this.venuesRepository.findOne({ where: { id: venueId, businessUserId: ownerId } });
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

  async createStaff(actorId: string, data: { email: string; name: string; password: string; phone?: string }) {
    const actor = await this.getBusinessUser(actorId);
    if (actor.role !== BusinessRole.OWNER) throw new ForbiddenException('Only owners can create staff accounts');
    if (await this.businessUsersRepository.findOne({ where: { email: data.email.toLowerCase() } })) {
      throw new ConflictException('Email already registered');
    }
    const staff = this.businessUsersRepository.create({
      email: data.email.toLowerCase(), name: data.name, phone: data.phone,
      password: await bcrypt.hash(data.password, 10), role: BusinessRole.STAFF,
      accountOwnerId: actor.id, isApproved: true, isActive: true,
    });
    const saved = await this.businessUsersRepository.save(staff);
    return { id: saved.id, email: saved.email, name: saved.name, role: saved.role, isActive: saved.isActive };
  }

  async listStaff(actorId: string) {
    const actor = await this.getBusinessUser(actorId);
    const ownerId = actor.role === BusinessRole.OWNER ? actor.id : actor.accountOwnerId;
    if (!ownerId) throw new ForbiddenException('Business team is unavailable');
    return this.businessUsersRepository.find({
      where: { accountOwnerId: ownerId },
      select: ['id', 'email', 'name', 'phone', 'role', 'isActive', 'createdAt'],
      order: { name: 'ASC' },
    });
  }

  async deactivateStaff(actorId: string, staffId: string) {
    const actor = await this.getBusinessUser(actorId);
    if (actor.role !== BusinessRole.OWNER) throw new ForbiddenException('Only owners can deactivate staff accounts');
    const staff = await this.businessUsersRepository.findOne({ where: { id: staffId, accountOwnerId: actor.id } });
    if (!staff) throw new NotFoundException('Staff user not found');
    staff.isActive = false;
    await this.businessUsersRepository.save(staff);
    await this.assignmentsRepository.update({ businessUserId: staff.id }, { isActive: false });
    return { success: true };
  }

  async updateLiveInfo(businessUserId: string, venueId: string, data: {
    type: string; title: string; details?: string; startsAt?: string; endsAt?: string; isActive?: boolean;
  }) {
    const venue = await this.assertVenueAccess(businessUserId, venueId);
    const update = this.liveUpdatesRepository.create({
      venueId, type: data.type, title: data.title, details: data.details,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      isActive: data.isActive ?? true, updatedByBusinessUserId: businessUserId,
    });
    const saved = await this.liveUpdatesRepository.save(update);
    const city = venue.cityRecord?.slug || venue.city.toLowerCase();
    this.liveGateway.broadcastWhatsOnUpdate(city, venueId, saved);
    return saved;
  }

  async getLiveInfo(businessUserId: string, venueId: string) {
    await this.assertVenueAccess(businessUserId, venueId);
    return this.liveUpdatesRepository.find({ where: { venueId, isActive: true }, order: { createdAt: 'DESC' } });
  }
}
