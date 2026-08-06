import {
    IssueTypeEnum, IssueStatusEnum, IssueRiskEnum
} from '@prisma/client';
import { v4 as uuid } from 'uuid';

import { GCSBucket, SignedUrl } from '@/lib/GCSBucket';
import { IssueRepository } from '@/repositories';
import {
    CreateIssueInput,
    SetIssueGroupInput
} from '@/schemas/issueSchema';
import { IssueNotificationService } from '@/services/IssueNotificationService';
import { logger } from '@/utils/logger';

type RepositoryIssue = Awaited<ReturnType<IssueRepository['getIssue']>>;
type NotificationIssue = Parameters<IssueNotificationService['sendIssueCreatedConfirmation']>[0];

export const SAME_PARK_ISSUE_GROUP_ERROR = 'Duplicate issues can only be grouped within the same park.';

export class IssueService {
    private readonly issueRepository: IssueRepository;
    private readonly issueImageBucket: GCSBucket;
    private readonly issueNotificationService: IssueNotificationService;

    constructor(
        issueRepository: IssueRepository,
        imagesBucket: GCSBucket,
        issueNotificationService: IssueNotificationService
    ) {
        this.issueRepository = issueRepository;
        this.issueImageBucket = imagesBucket;
        this.issueNotificationService = issueNotificationService;
    }

    private async getIssueImage(imageKey: string, providedContentType?: string) {

        try {
            const signedUrl = await this.issueImageBucket.getDownloadUrl(imageKey);

            // Bypass GCS metadata fetch if we already know it (e.g., during issue creation)
            if (providedContentType) {
                return {
                    ...signedUrl,
                    contentType: providedContentType,
                    metadata: {}
                };
            }

            const {
                contentType,
                metadata
            } = await this.issueImageBucket.getImageMetadata(imageKey);

            return {
                ...signedUrl,
                contentType,
                metadata: metadata ?? {}
            };

        } catch (error) {
            logger.error(`Could not find issue image with key ${imageKey}`);
            logger.error(error);
            
            return {
                errorMessage: 'Error: Unable to load image'
            };
        }
    }

    private toNotificationIssue(issue: NonNullable<RepositoryIssue>): NotificationIssue {
        return {
            ...issue,
            issueGroupId: issue.issueGroupId ?? null,
        };
    }

    private async toIssueResponse(issue: RepositoryIssue, 
        providedImageMetadata?: { contentType: string }) {
        if (!issue) {
            return null;
        }

        const {
            issueImage,
            issueGroup,
            ...issueData
        } = issue;

        const groupIssues: Array<{ issueId: number }> =
            Array.isArray(issueGroup?.issues) ? issueGroup.issues : [];

        const issueGroupMemberIds = (
            groupIssues.length > 0 ? groupIssues : [{ issueId: issue.issueId }]
        )
            .map((groupIssue) => groupIssue.issueId)
            .sort((a: number, b: number) => a - b);

        return {
            ...issueData,
            status: issueGroup?.status ?? issue.status,
            issueGroupId: issue.issueGroupId ?? issueGroup?.issueGroupId ?? null,
            issueGroupMemberIds,
            ...(issueImage && { image: await this.getIssueImage(issueImage, 
                providedImageMetadata?.contentType) })
        };
    }

    public async getIssue(issueId: number) {
        const issue = await this.issueRepository.getIssue(issueId);
        return this.toIssueResponse(issue);
    }
    
    public async getAllIssues(reporterEmail?: string, ownerEmail?: string) {
        const issues = await this.issueRepository.getAllIssues(reporterEmail, ownerEmail);
        return Promise.all(issues.map((issue) => this.toIssueResponse(issue)));
    }

    public async getMapPins(minLat: number, 
        minLng: number, 
        maxLat: number, 
        maxLng: number,
        issueTypes: IssueTypeEnum[],
        statuses: IssueStatusEnum[]) {
        return this.issueRepository.getMapPins(
            minLat, minLng, maxLat, maxLng, issueTypes, statuses
        );
    }

    public async createIssue(data: CreateIssueInput) {
        const { imageMetadata } = data;
        let key: string | undefined;
        let signedUrl: SignedUrl | undefined;

        if (imageMetadata) {
            // Generate image key
            const ext = imageMetadata.contentType.split('/')[1];
            key = `${uuid()}.${ext}`;

            signedUrl = await this.issueImageBucket.getUploadUrl(key, imageMetadata);
        }

        const newIssueInput = {
            issueImageKey: key,
            ...data
        };

        const issue = await this.issueRepository.createIssue(newIssueInput);

        if (!issue) {
            throw new Error('Failed to create issue');
        }

        const notificationIssue = this.toNotificationIssue(issue);
        await this.issueNotificationService.sendIssueCreatedConfirmation(notificationIssue);
        await this.issueNotificationService.sendNewIssueParkNotification(notificationIssue);

        const issueResponse = await this.toIssueResponse(issue, imageMetadata);

        return {
            issue: issueResponse,
            signedUrl,
        };
    }

    public async deleteIssue(issueId: number) {
        return this.issueRepository.deleteIssue(issueId);
    }

    public async getIssuesByPark(
        parkId: number, 
        statuses: IssueStatusEnum[], 
        startDate?: string, 
        endDate?: string
    ) {
        const issues = 
		    await this.issueRepository.getIssuesByPark(parkId, statuses, startDate, endDate);
        return Promise.all(issues.map((issue) => this.toIssueResponse(issue)));
    }

    public async updateIssueStatus(issueId: number, status: IssueStatusEnum) {
        const existingIssue = await this.issueRepository.getIssue(issueId);

        if (!existingIssue) {
            return null;
        }

        const issue = await this.issueRepository.updateIssueStatus(issueId, status);
        if (!issue) {
            return null;
        }

        const statusChanged = existingIssue.status !== status;
        const notificationIssue = this.toNotificationIssue(issue);

        if (statusChanged && status === IssueStatusEnum.IN_PROGRESS) {
            await this.issueNotificationService.sendIssueInProgressUpdate(notificationIssue);
        }

        if (statusChanged && status === IssueStatusEnum.RESOLVED) {
            await this.issueNotificationService.sendIssueResolvedUpdate(notificationIssue);
        }

        return this.toIssueResponse(issue);
    }

    public async getGroupedIssues(issueId: number) {
        const issue = await this.issueRepository.getIssue(issueId);
        if (!issue) {
            return null;
        }

        if (!issue.issueGroupId) {
            const response = await this.toIssueResponse(issue);
            return response ? [response] : [];
        }

        const groupedIssues = await this.issueRepository.getIssuesByGroup(issue.issueGroupId);
        return Promise.all(groupedIssues.map((groupedIssue) => this.toIssueResponse(groupedIssue)));
    }

    public async setIssueGroup(issueId: number, data: SetIssueGroupInput) {
        const sourceIssue = await this.issueRepository.getIssue(issueId);

        if (!sourceIssue) {
            return null;
        }

        const requestedMemberIds = Array
            .from(new Set(data.issueGroupMemberIds))
            .filter((memberId) => memberId !== issueId);

        if (requestedMemberIds.length > 0) {
            const allIssues = await this.issueRepository.getAllIssues();
            const requestedIssues = allIssues.filter(
                (candidate) => requestedMemberIds.includes(candidate.issueId)
            );

            if (requestedIssues.length !== requestedMemberIds.length) {
                return null;
            }

            const hasCrossParkIssue = requestedIssues.some(
                (candidate) => candidate.parkId !== sourceIssue.parkId
            );

            if (hasCrossParkIssue) {
                throw new Error(SAME_PARK_ISSUE_GROUP_ERROR);
            }
        }

        const issue = await this.issueRepository.setIssueGroupMembers(
            issueId, requestedMemberIds
        );
        return this.toIssueResponse(issue);
    }

    public async unsubscribeReporter(issueId: number, token: string) {
        const payload = this.issueNotificationService.verifyUnsubscribeToken(token);

        if (!payload || payload.issueId !== issueId) {
            return 'invalid-token' as const;
        }

        const issue = await this.issueRepository.getIssue(issueId);
        if (!issue) {
            return 'issue-not-found' as const;
        }

        if (issue.reporterEmail.toLowerCase() !== payload.email.toLowerCase()) {
            return 'invalid-token' as const;
        }

        if (!issue.notifyReporter) {
            return 'already-unsubscribed' as const;
        }

        const updated = 
            await this.issueRepository.disableReporterNotifications(issueId, issue.reporterEmail);
        return updated ? 'unsubscribed' as const : 'invalid-token' as const;
    }

    public async updateIssue(issueId: number, data: {
        description?: string;
        safetyRisk?: IssueRiskEnum;
        issueType?: IssueTypeEnum;
        isImagePublic?: boolean;
        parkId?: number;
		latitude?: number;
		longitude?: number;
    }) {
        const issue = await this.issueRepository.updateIssue(issueId, data);

        if (!issue) {
            return null;
        }

        return this.toIssueResponse(issue);
    }
}
