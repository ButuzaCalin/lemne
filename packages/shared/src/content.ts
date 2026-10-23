import { z } from 'zod';

const tags = z.array(z.string().min(1)).default([]);

/** Where locally served slide images live (content/images/ on disk). */
export const LOCAL_IMAGES_PATH = '/images/';

/** A full URL (R2 later) or a file served by our own server from content/images/. */
const ImageSrc = z.union([z.url(), z.string().regex(/^\/images\/[\w-]+\.webp$/)]);

export const ImageSlideSchema = z.object({
  id: z.string().regex(/^img-\d{3,}$/),
  type: z.literal('image'),
  src: ImageSrc,
  thumb: ImageSrc,
  alt: z.string().min(1),
  tags,
  /** First 16 hex chars of the source file's SHA-256, so re-running the import skips it. */
  sourceHash: z.string().regex(/^[0-9a-f]{16}$/).optional(),
});

export const TextSlideSchema = z.object({
  id: z.string().regex(/^txt-\d{3,}$/),
  type: z.literal('text'),
  text: z.string().min(1).max(140),
  tags,
});

export const SlideSchema = z.discriminatedUnion('type', [ImageSlideSchema, TextSlideSchema]);
export type Slide = z.infer<typeof SlideSchema>;

export const SlidesFileSchema = z.array(SlideSchema);
export const TitlesFileSchema = z.array(z.string().min(3).max(80));
export const PromptsFileSchema = z.array(z.string().min(3).max(100));
/** Lines the TV shows for a moment before each new slide, e.g. „Și acum, ceva complet diferit…”. */
export const TransitionsFileSchema = z.array(z.string().min(2).max(80));

export const AwardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
});
export const AwardsFileSchema = z.array(AwardSchema);
export type Award = z.infer<typeof AwardSchema>;
