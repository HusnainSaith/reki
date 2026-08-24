import { Vibe } from './vibe.entity';

describe('Vibe Entity', () => {
  let vibe: Vibe;

  beforeEach(() => {
    vibe = new Vibe();
  });

  it('should create a vibe instance', () => {
    expect(vibe).toBeDefined();
    expect(vibe).toBeInstanceOf(Vibe);
  });

  it('should store tags as string array', () => {
    vibe.tags = ['Chill', 'Party', 'Live Music'];
    expect(vibe.tags).toHaveLength(3);
    expect(vibe.tags).toContain('Chill');
  });

  it('should store music genres as string array', () => {
    vibe.musicGenre = ['House', 'R&B', 'Techno'];
    expect(vibe.musicGenre).toHaveLength(3);
  });

  it('should accept vibeCheckScore in range', () => {
    [0, 1.0, 2.5, 4.8, 5.0].forEach(score => {
      vibe.vibeCheckScore = score;
      expect(vibe.vibeCheckScore).toBeCloseTo(score, 1);
    });
  });

  it('should store responseCount as integer', () => {
    vibe.responseCount = 42;
    expect(vibe.responseCount).toBe(42);
  });

  it('should store description', () => {
    vibe.description = 'Lively atmosphere with live DJ';
    expect(vibe.description).toContain('Lively');
  });

  it('should store updatedBy', () => {
    vibe.updatedBy = 'business-user-456';
    expect(vibe.updatedBy).toBe('business-user-456');
  });

  it('should store venueId', () => {
    vibe.venueId = 'venue-uuid-123';
    expect(vibe.venueId).toBe('venue-uuid-123');
  });
});
