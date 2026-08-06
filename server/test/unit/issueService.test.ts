import { GCSBucket, SignedUrl } from '@/lib/GCSBucket';
import { IssueRepository } from '@/repositories';
import { CreateIssueInput } from '@/schemas/issueSchema';
import { IssueService } from '@/services';
import { SAME_PARK_ISSUE_GROUP_ERROR } from '@/services/IssueService';
import { IssueNotificationService } from '@/services/IssueNotificationService';
import { IssueStatusEnum, IssueTypeEnum, IssueRiskEnum } from '@prisma/client';

jest.mock('@/repositories/IssueRepository');
jest.mock('@/lib/GCSBucket');

describe('IssueService', () => {
    let issueService: IssueService;
    let issueRepositoryMock: jest.Mocked<IssueRepository>;
    let issueImageBucketMock: jest.Mocked<GCSBucket>;
    let issueNotificationServiceMock: jest.Mocked<IssueNotificationService>;

    const uploadUrl: SignedUrl = {
        url: 'test.jpg',
        key: 'unique',
    };

    const baseIssue = {
        issueId: 1,
        parkId: 1,
        issueType: IssueTypeEnum.WATER,
        safetyRisk: IssueRiskEnum.NO_RISK,
        passible: true,
        description: 'Trail is flooded',
        isPublic: true,
        isImagePublic: false,
        status: IssueStatusEnum.UNRESOLVED,
        notifyReporter: true,
        reporterEmail: 'reporter@example.com',
        ownerEmail: 'reporter@example.com',
        issueGroupId: null,
        longitude: -79.9901,
        latitude: 40.4406,
        createdAt: new Date(),
        resolvedAt: null,
        issueImage: null,
        park: { 
			parkId: 1, 
			name: 'Test Park',
			county: 'Allegheny',
			email: null,
			minLatitude: 40,
			minLongitude: 40,
			maxLatitude: 80,
			maxLongitude: 80,
			isActive: true, 
			createdAt: new Date() 
		},
    };

    const {
        issueImage: _baseIssueImage,
        ...baseIssueWithoutImage
    } = baseIssue;

    const issueTwo = {
        ...baseIssue,
        issueId: 2,
        reporterEmail: 'john@example.com',
        ownerEmail: 'john@example.com'
    };

    const issueThree = {
        ...baseIssue,
        issueId: 3,
        reporterEmail: 'jane@example.com',
        ownerEmail: 'jane@example.com'
    };

    const issueFour = {
        ...baseIssue,
        issueId: 4,
        reporterEmail: 'jane@gmail.com',
        ownerEmail: 'jane@example.com'
    };

    beforeEach(() => {
        jest.resetAllMocks();

        issueRepositoryMock = new IssueRepository() as jest.Mocked<IssueRepository>;
        issueImageBucketMock = {
            getUploadUrl: jest.fn().mockReturnValue(uploadUrl),
            getDownloadUrl: jest.fn().mockReturnValue(uploadUrl),
        } as unknown as jest.Mocked<GCSBucket>;

        issueNotificationServiceMock = {
            sendIssueCreatedConfirmation: jest.fn(),
            sendNewIssueParkNotification: jest.fn(),
            sendIssueInProgressUpdate: jest.fn(),
            sendIssueResolvedUpdate: jest.fn(),
            verifyUnsubscribeToken: jest.fn(),
        } as unknown as jest.Mocked<IssueNotificationService>;

        issueService = new IssueService(
            issueRepositoryMock,
            issueImageBucketMock,
            issueNotificationServiceMock
        );
    });

    test('should create a new issue with required fields', async () => {
        issueRepositoryMock.createIssue.mockResolvedValue(baseIssue);
        issueImageBucketMock.getUploadUrl.mockResolvedValue(uploadUrl);

        const input: CreateIssueInput = {
            parkId: 1,
            issueType: IssueTypeEnum.WATER,
            safetyRisk: IssueRiskEnum.NO_RISK,
            passible: true,
            reporterEmail: 'reporter@example.com',
            description: 'Trail is flooded',
            latitude: 40.4406,
            longitude: -79.9901,
            isPublic: true,
            isImagePublic: false,
            status: IssueStatusEnum.UNRESOLVED,
            notifyReporter: true,
            imageMetadata: {
                contentType: 'image/jpeg'
            },
        };

        const result = await issueService.createIssue(input);

        expect(issueRepositoryMock.createIssue).toHaveBeenCalled();
        expect(result).toEqual({
            signedUrl: uploadUrl,
            issue: {
                ...baseIssueWithoutImage,
                issueGroupId: null,
                issueGroupMemberIds: [baseIssue.issueId],
            }
        });
    });

    test('should create a new issue with all optional fields', async () => {
        const fullIssue = {
            ...baseIssue,
            isPublic: false,
            isImagePublic: false,
            status: IssueStatusEnum.IN_PROGRESS,
            notifyReporter: false,
            longitude: -80.001,
            latitude: 40.441
        };

        issueRepositoryMock.createIssue.mockResolvedValue(fullIssue);

        const input = {
            parkId: 1,
            issueType: IssueTypeEnum.WATER,
            safetyRisk: IssueRiskEnum.NO_RISK,
            passible: true,
            description: 'Very flooded trail',
            isPublic: false,
            isImagePublic: false,
            status: IssueStatusEnum.IN_PROGRESS,
            notifyReporter: false,
            reporterEmail: 'reporter@example.com',
            longitude: -80.001,
            latitude: 40.441
        };

        const result = await issueService.createIssue(input);

        const {
            issueImage: _fullIssueImage,
            ...fullIssueWithoutImage
        } = fullIssue;

        expect(issueRepositoryMock.createIssue).toHaveBeenCalledWith(input);
        expect(result).toEqual({
            signedUrl: undefined,
            issue: {
                ...fullIssueWithoutImage,
                issueGroupId: null,
                issueGroupMemberIds: [fullIssue.issueId],
            }
        });
    });

    test('should get an issue by ID', async () => {
        issueRepositoryMock.getIssue.mockResolvedValue(baseIssue);

        const result = await issueService.getIssue(1);

        expect(issueRepositoryMock.getIssue).toHaveBeenCalledWith(1);
        expect(result).toEqual({
            ...baseIssueWithoutImage,
            issueGroupId: null,
            issueGroupMemberIds: [baseIssue.issueId],
        });
    });

    test('should return null if issue is not found', async () => {
        issueRepositoryMock.getIssue.mockResolvedValue(null);

        const result = await issueService.getIssue(999);

        expect(issueRepositoryMock.getIssue).toHaveBeenCalledWith(999);
        expect(result).toBeNull();
    });

    test('should delete an issue', async () => {
        issueRepositoryMock.deleteIssue.mockResolvedValue(true);

        const result = await issueService.deleteIssue(1);

        expect(issueRepositoryMock.deleteIssue).toHaveBeenCalledWith(1);
        expect(result).toBe(true);
    });

    test('should get issues by park ID', async () => {
        const issues = [baseIssue];
        issueRepositoryMock.getIssuesByPark.mockResolvedValue(issues);

		const statuses = [IssueStatusEnum.UNRESOLVED, IssueStatusEnum.IN_PROGRESS, IssueStatusEnum.RESOLVED];
        const result = await issueService.getIssuesByPark(1, statuses);

        expect(issueRepositoryMock.getIssuesByPark).toHaveBeenCalledWith(1, statuses, undefined, undefined);
        expect(result).toEqual([
            {
                ...baseIssueWithoutImage,
                issueGroupId: null,
                issueGroupMemberIds: [baseIssue.issueId],
            }
        ]);
    });

	test('should get map pins for issues within bounding box and filters', async () => {
		const issues = [baseIssue];
		issueRepositoryMock.getMapPins.mockResolvedValue(issues);

		const result = await issueService.getMapPins(40.4306, -80.0059, 40.4506, -79.9859, [IssueTypeEnum.WATER], [IssueStatusEnum.UNRESOLVED]);

		expect(issueRepositoryMock.getMapPins).toHaveBeenCalledWith(40.4306, -80.0059, 40.4506, -79.9859, [IssueTypeEnum.WATER], [IssueStatusEnum.UNRESOLVED]);
		expect(result.length).toBe(1);
		expect(result[0].issueId).toBe(baseIssue.issueId);
		expect(result[0].issueType).toBe(baseIssue.issueType);
		expect(result[0].status).toBe(baseIssue.status);
		expect(result[0].createdAt).toBe(baseIssue.createdAt);
		expect(result[0].latitude).toBe(baseIssue.latitude);
		expect(result[0].longitude).toBe(baseIssue.longitude);
	});

    test('should update issue status', async () => {
        const updated = { ...baseIssue, status: IssueStatusEnum.RESOLVED, resolvedAt: new Date() };
        issueRepositoryMock.getIssue.mockResolvedValue(baseIssue);
        issueRepositoryMock.updateIssueStatus.mockResolvedValue(updated);

        const result = await issueService.updateIssueStatus(1, IssueStatusEnum.RESOLVED);

        const {
            issueImage: _updatedIssueImage,
            ...updatedWithoutImage
        } = updated;

        expect(issueRepositoryMock.updateIssueStatus).toHaveBeenCalledWith(1, IssueStatusEnum.RESOLVED);
        expect(result).toEqual({
            ...updatedWithoutImage,
            issueGroupId: null,
            issueGroupMemberIds: [updated.issueId],
        });
    });

    test('should set issue group when all selected issues are in the same park', async () => {
        const secondIssue = {
            ...baseIssue,
            issueId: 2,
        };

        issueRepositoryMock.getIssue.mockResolvedValue(baseIssue);
        issueRepositoryMock.getAllIssues.mockResolvedValue([baseIssue, secondIssue]);
        issueRepositoryMock.setIssueGroupMembers.mockResolvedValue({
            ...baseIssue,
            issueGroup: {
                issueGroupId: 10,
                primaryIssueId: 1,
                status: IssueStatusEnum.UNRESOLVED,
                issues: [{ issueId: 1 }, { issueId: 2 }],
            },
        } as Awaited<ReturnType<IssueRepository['getIssue']>>);

        const result = await issueService.setIssueGroup(1, {
            issueGroupMemberIds: [2],
        });

        expect(issueRepositoryMock.setIssueGroupMembers).toHaveBeenCalledWith(1, [2]);
        expect(result).toEqual(expect.objectContaining({
            issueGroupId: 10,
            issueGroupMemberIds: [1, 2],
        }));
    });

    test('should reject setting issue group when selected issues are in a different park', async () => {
        const otherParkIssue = {
            ...baseIssue,
            issueId: 2,
            parkId: 999,
            park: {
                parkId: 999,
                name: 'Other Park',
                county: 'Allegheny',
                email: null,
                minLatitude: 40,
                minLongitude: 40,
                maxLatitude: 80,
                maxLongitude: 80,
                isActive: true,
                createdAt: new Date(),
            },
        };

        issueRepositoryMock.getIssue.mockResolvedValue(baseIssue);
        issueRepositoryMock.getAllIssues.mockResolvedValue([baseIssue, otherParkIssue]);

        await expect(issueService.setIssueGroup(1, {
            issueGroupMemberIds: [2],
        })).rejects.toThrow(SAME_PARK_ISSUE_GROUP_ERROR);

        expect(issueRepositoryMock.setIssueGroupMembers).not.toHaveBeenCalled();
    });

	test('should update an issue', async () => {
		const data = {
			description: 'Tree is down blocking the path',
			issueType: IssueTypeEnum.OBSTRUCTION,
			parkId: 2,
			longitude: -79.9905,
			latitude: 40.4407,
		}
		const updatedIssue = {
			...baseIssue,
			...data
		}

		const {
            issueImage: _updatedIssueImage,
            ...updatedWithoutImage
        } = updatedIssue;

		issueRepositoryMock.getIssue.mockResolvedValue(baseIssue);
		issueRepositoryMock.updateIssue.mockResolvedValue(updatedIssue);

		const initial = await issueService.getIssue(1);
		expect(initial).toEqual({
			...baseIssueWithoutImage,
			issueGroupId: null,
			issueGroupMemberIds: [baseIssue.issueId],
		});

		const result = await issueService.updateIssue(1, data);
		expect(result).toEqual({
             ...updatedWithoutImage,
            issueGroupId: null,
            issueGroupMemberIds: [updatedIssue.issueId],
        });
	});

     test('should return empty array if no issues found', async () => {
        
        issueRepositoryMock.getAllIssues.mockResolvedValue([]);

        const result = await issueService.getAllIssues();

        expect(issueRepositoryMock.getAllIssues)
            .toHaveBeenCalledWith(undefined, undefined);
       
        expect(result).toEqual([]);
    });

    test('should return all issues transformed with issueGroupMemberIds', async () => {

        const issues = [baseIssue, issueTwo, issueThree, issueFour];

        issueRepositoryMock.getAllIssues.mockResolvedValue(issues);

        const result = await issueService.getAllIssues();

        expect(issueRepositoryMock.getAllIssues)
            .toHaveBeenCalledWith(undefined, undefined);

        expect(result).toEqual([
            {
                ...baseIssueWithoutImage,
                issueGroupId: null,
                reporterEmail: 'reporter@example.com',
                ownerEmail: 'reporter@example.com',
                issueGroupMemberIds: [1],
            },
            {
                ...baseIssueWithoutImage,
                issueId: 2,
                reporterEmail: 'john@example.com',
                ownerEmail: 'john@example.com',
                issueGroupId: null,
                issueGroupMemberIds: [2],
            },
            {
                ...baseIssueWithoutImage,
                issueId: 3,
                reporterEmail: 'jane@example.com',
                ownerEmail: 'jane@example.com',
                issueGroupId: null,
                issueGroupMemberIds: [3],
            },
            {
                ...baseIssueWithoutImage,
                issueId: 4,
                reporterEmail: 'jane@gmail.com',
                ownerEmail: 'jane@example.com',
                issueGroupId: null,
                issueGroupMemberIds: [4],
            }
        ]);
    });

    test('should map grouped issues correctly', async () => {
        const groupedIssue = {
            ...baseIssue,
            issueGroupId: 10,
            issueGroup: {
                issueGroupId: 10,
                status: IssueStatusEnum.IN_PROGRESS,
                issues: [{ issueId: 1 }, { issueId: 2 }],
            },
        };

        issueRepositoryMock.getAllIssues.mockResolvedValue([groupedIssue]);

        const result = await issueService.getAllIssues();

        expect(result).toEqual([
            expect.objectContaining({
                issueGroupId: 10,
                issueGroupMemberIds: [1, 2],
                status: IssueStatusEnum.IN_PROGRESS, // overridden by group
            }),
        ]);
    });

    test('should include image data when issue has image', async () => {
        const issueWithImage = {
            ...baseIssue,
            issueImage: 'image-key',
        };

        issueRepositoryMock.getAllIssues.mockResolvedValue([issueWithImage]);

        issueImageBucketMock.getDownloadUrl.mockResolvedValue(uploadUrl);
        issueImageBucketMock.getImageMetadata = jest.fn().mockResolvedValue({
            contentType: 'image/jpeg',
            metadata: {},
        });

        const result = await issueService.getAllIssues();

        expect(result?.[0]).toHaveProperty('image');
        expect(issueImageBucketMock.getDownloadUrl).toHaveBeenCalledWith('image-key');
    });

    test('should handle null issues gracefully', async () => {
        issueRepositoryMock.getAllIssues.mockResolvedValue([null] as any);

        const result = await issueService.getAllIssues();

        expect(result).toEqual([null]);
    });

});
