import { z } from 'zod';

// Optional contact email for the park. Empty strings are normalized to null so
// clearing the field in the admin form removes the stored address.
const parkEmail = z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().email('A valid email address is required').nullish()
);

export const getParkSchema = z.object({
    params: z.object({
        parkId: z.coerce.number(),
    })
});

export const createParkSchema = z.object({
    body: z.object({
        name: z.string(),
        county: z.string(),
        email: parkEmail,
        minLatitude: z.number(),
        minLongitude: z.number(),
        maxLatitude: z.number(),
        maxLongitude: z.number(),
        isActive: z.boolean().default(true).optional(),
    })
});

export const updateParkSchema = z.object({
    params: z.object({
        parkId: z.coerce.number(),
    }),
    body: z.object({
        name: z.string().optional(),
        county: z.string().optional(),
        email: parkEmail,
        minLatitude: z.number().optional(),
        minLongitude: z.number().optional(),
        maxLatitude: z.number().optional(),
        maxLongitude: z.number().optional(),
        isActive: z.boolean().optional(),
    })
});

export const deleteParkSchema = z.object({
    params: z.object({
        parkId: z.coerce.number(),
    })
});

export type CreatePark = z.infer<typeof createParkSchema>['body'];
export type UpdatePark = z.infer<typeof updateParkSchema>['body'];
