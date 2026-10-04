import { defineCollection, z } from "astro:content";

const services = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    order: z.number(),
    image: z.string(),
    imageAlt: z.string(),
  }),
});

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    category: z.string(),
    location: z.string(),
    image: z.string(),
    thumbnail: z.string().optional(),
    alt: z.string(),
    order: z.number(),
    gridLayout: z.enum(["large", "wide", "tall", "small"]).optional(),
  }),
});

export const collections = { services, projects };
