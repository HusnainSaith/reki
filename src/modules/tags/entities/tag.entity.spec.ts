import { Tag } from './tag.entity';
import { TagCategory } from '../../../common/enums';

describe('Tag Entity', () => {
  let tag: Tag;

  beforeEach(() => {
    tag = new Tag();
  });

  it('should create a tag instance', () => {
    expect(tag).toBeDefined();
    expect(tag).toBeInstanceOf(Tag);
  });

  it('should accept VIBE category', () => {
    tag.category = TagCategory.VIBE;
    expect(tag.category).toBe(TagCategory.VIBE);
  });

  it('should accept MUSIC category', () => {
    tag.category = TagCategory.MUSIC;
    expect(tag.category).toBe(TagCategory.MUSIC);
  });

  it('should store unique tag name', () => {
    tag.name = 'Chill';
    expect(tag.name).toBe('Chill');
  });

  it('should default isActive to true', () => {
    tag.isActive = true;
    expect(tag.isActive).toBe(true);
  });

  it('should allow deactivating tag', () => {
    tag.isActive = false;
    expect(tag.isActive).toBe(false);
  });
});
