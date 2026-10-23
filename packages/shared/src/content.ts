import { z } from 'zod';

const tags = z.array(z.string().min(1)).default([]);

export const ImageSlideSchema = z.object({
  id: z.string().regex(/^img-\d{3,}$/),
  type: z.literal('image'),
  src: z.url(),
  thumb: z.url(),
  alt: z.string().min(1),
  tags,
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

export const AwardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
});
export const AwardsFileSchema = z.array(AwardSchema);
export type Award = z.infer<typeof AwardSchema>;
