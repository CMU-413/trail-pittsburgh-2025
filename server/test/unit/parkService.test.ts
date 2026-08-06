import { ParkRepository } from '@/repositories';
import { ParkService } from '@/services';

jest.mock('@/repositories/ParkRepository');

describe('ParkService', () => {
    let parkService: ParkService;
    let parkRepositoryMock: jest.Mocked<ParkRepository>;

    const mockPark = {
        parkId: 1,
        name: 'Test Park',
        county: 'Test County',
        email: null,
		minLatitude: 40,
		minLongitude: 40,
		maxLatitude: 80,
		maxLongitude: 80,
        isActive: true,
        createdAt: new Date()
    };

    beforeEach(() => {
        parkRepositoryMock = new ParkRepository() as jest.Mocked<ParkRepository>;
        parkService = new ParkService(parkRepositoryMock);
    });

    test('should create a new park', async () => {
        parkRepositoryMock.createPark.mockResolvedValue(mockPark);

        const newParkInput = { 
			name: 'Test Park', 
			county: 'Test County',
			minLatitude: 40,
			minLongitude: 40,
			maxLatitude: 80,
			maxLongitude: 80,
		};
		
        const result = await parkService.createPark(newParkInput);

        expect(parkRepositoryMock.createPark).toHaveBeenCalledWith(newParkInput);
        expect(result).toEqual(mockPark);
    });

    test('should get a park by ID', async () => {
        parkRepositoryMock.getPark.mockResolvedValue(mockPark);

        const result = await parkService.getPark(1);

        expect(parkRepositoryMock.getPark).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockPark);
    });

    test('should return null if park is not found', async () => {
        parkRepositoryMock.getPark.mockResolvedValue(null);

        const result = await parkService.getPark(999);

        expect(parkRepositoryMock.getPark).toHaveBeenCalledWith(999);
        expect(result).toBeNull();
    });

    test('should delete a park if it exists', async () => {
        parkRepositoryMock.getPark.mockResolvedValue(mockPark);
        parkRepositoryMock.deletePark.mockResolvedValue(true);

        const result = await parkService.deletePark(1);

        expect(parkRepositoryMock.getPark).toHaveBeenCalledWith(1);
        expect(parkRepositoryMock.deletePark).toHaveBeenCalledWith(1);
        expect(result).toBe(true);
    });

    test('should not delete a park if it does not exist', async () => {
        parkRepositoryMock.getPark.mockResolvedValue(null);

        const result = await parkService.deletePark(999);

        expect(parkRepositoryMock.getPark).toHaveBeenCalledWith(999);
        expect(result).toBe(false);
    });

    test('should update a park if it exists', async () => {
        const updateData = { name: 'Updated Name' };
        const updatedPark = { ...mockPark, name: 'Updated Name' };

        parkRepositoryMock.getPark.mockResolvedValue(mockPark);
        parkRepositoryMock.updatePark.mockResolvedValue(updatedPark);

        const result = await parkService.updatePark(1, updateData);

        expect(parkRepositoryMock.getPark).toHaveBeenCalledWith(1);
        expect(parkRepositoryMock.updatePark).toHaveBeenCalledWith(1, updateData);
        expect(result).toEqual(updatedPark);
    });

    test('should not update a park if it does not exist', async () => {
        parkRepositoryMock.getPark.mockResolvedValue(null);

        const result = await parkService.updatePark(999, { name: 'Does Not Exist' });

        expect(parkRepositoryMock.getPark).toHaveBeenCalledWith(999);
        expect(result).toBeNull();
    });

    test('should get all parks', async () => {
        parkRepositoryMock.getAllParks.mockResolvedValue([mockPark]);

        const result = await parkService.getAllParks();

        expect(parkRepositoryMock.getAllParks).toHaveBeenCalled();
        expect(result).toEqual([mockPark]);
    });
});
