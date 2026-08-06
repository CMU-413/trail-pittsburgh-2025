import express from 'express';

import { ParkService } from '@/services';
import { logger } from '@/utils/logger';

export class ParkController {

    private readonly parkService: ParkService;

    constructor(parkService: ParkService) {
        this.parkService = parkService;

        this.getPark = this.getPark.bind(this);
        this.getAllParks = this.getAllParks.bind(this);
        this.createPark = this.createPark.bind(this);
        this.updatePark = this.updatePark.bind(this);
        this.deletePark = this.deletePark.bind(this);
    }

    public async getPark(req: express.Request, res: express.Response) {
        const parkId = Number(req.params.parkId);
        
        try {
            const park = await this.parkService.getPark(parkId);

            if (!park) {
                res.status(404).json({ message: 'Park not found.' });
                return;
            }

            res.status(200).json({ park });
        } catch (error) {
            logger.error(`Error fetching park ${parkId}`, error);
            res.status(500).json({ message: 'Failed to retrieve park' });
        }
    }

    public async getAllParks(req: express.Request, res: express.Response) {
        try {
            const parks = await this.parkService.getAllParks();
            res.json({ parks });
        } catch (error) {
            logger.error(`Error fetching all parks`, error);
            res.status(500).json({ message: 'Failed to retrieve all parks' });
        }
    }

    public async createPark(req: express.Request, res: express.Response) {
        try {
            const { name, county, email, minLatitude, minLongitude,
				 maxLatitude, maxLongitude, isActive } = req.body;

            // Validate required fields
            if (!name || !county || 
				minLatitude === undefined ||
				maxLatitude === undefined ||
				minLongitude === undefined ||
				maxLongitude === undefined) {
                res.status(400).json({ message: 'Name, county, and all latitude/longitude values are required' });
                return;
            }

            // Create park with all required properties
            const parkData = {
                name,
                county,
                email,
                minLatitude,
                minLongitude,
                maxLatitude,
                maxLongitude,
                isActive: isActive !== undefined ? isActive : true
            };

            const park = await this.parkService.createPark(parkData);
            res.status(201).json({ park });
            
        } catch (error) {
            logger.error(`Error creating park ${req.params.parkId}`, error);
            res.status(500).json({ message: 'Failed to create park' });
        }
    }

    public async updatePark(req: express.Request, res: express.Response) {
        const parkId = Number(req.params.parkId);

        try {
            const { name, county, email, minLatitude, minLongitude, 
                maxLatitude, maxLongitude, isActive } = req.body;

            const updatedPark = await this.parkService.updatePark(parkId, {
                name,
                county,
                email,
                minLatitude,
                minLongitude,
                maxLatitude,
                maxLongitude,
                isActive
            });

            if (!updatedPark) {
                res.status(404).json({ message: 'Park not found.' });
                return;
            }

            res.status(200).json({ park:updatedPark });
        } catch (error) {
            logger.error(`Error updating park ${parkId}`, error);
            res.status(500).json({ message: 'Failed to update park' });
        }
    }

    public async deletePark(req: express.Request, res: express.Response) {
        const parkId = Number(req.params.parkId);

        try {
            const deleted = await this.parkService.deletePark(parkId);

            if (!deleted) {
                res.status(404).json({ message: 'Park not found.' });
                return;
            }

            res.status(204).send();
        } catch (error) {
            logger.error(`Error deleting park ${parkId}`, error);
            res.status(500).json({ message: 'Failed to delete park' });
        }
    }
}

