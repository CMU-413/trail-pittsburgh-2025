import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

import { EmailClient, MailgunEmailClient } from '@/services/email';
import { logger } from '@/utils/logger';

type IssueWithRelations = Prisma.IssueGetPayload<{
    include: {
        park: true,
    }
}>;

type UnsubscribeTokenPayload = {
    issueId: number;
    email: string;
    type: 'issue-notification-unsubscribe';
};

export class IssueNotificationService {
    private readonly emailClient: EmailClient;
    private readonly unsubscribeSecret?: string;
    private readonly clientBaseUrl: string;
    private readonly serverBaseUrl: string;

    constructor(emailClient: EmailClient = new MailgunEmailClient()) {
        this.emailClient = emailClient;
        this.unsubscribeSecret =
            process.env.ISSUE_NOTIFICATION_UNSUBSCRIBE_SECRET ??
            process.env.JWT_SECRET;

        const isProduction = process.env.NODE_ENV === 'production';
        const configuredClientUrl = process.env.CLIENT_URL?.trim();
        const configuredServerUrl = process.env.SERVER_URL?.trim();

        if (isProduction && !configuredClientUrl) {
            logger.error('CLIENT_URL is missing in production. Email links will fallback to localhost.');
        }

        if (isProduction && !configuredServerUrl) {
            logger.warn('SERVER_URL is missing in production. Unsubscribe links will fallback to CLIENT_URL/localhost.');
        }

        this.clientBaseUrl = (configuredClientUrl || 'http://localhost:5173').replace(/\/+$/, '');
        this.serverBaseUrl = (configuredServerUrl || this.clientBaseUrl || 'http://localhost:3000').replace(/\/+$/, '');
    }

    public canSendEmails() {
        return this.emailClient.canSendEmails();
    }

    public createUnsubscribeToken(issueId: number, email: string) {
        if (!this.unsubscribeSecret) {
            return null;
        }

        return jwt.sign(
            {
                issueId,
                email,
                type: 'issue-notification-unsubscribe'
            } satisfies UnsubscribeTokenPayload,
            this.unsubscribeSecret,
            { expiresIn: '180d' }
        );
    }

    public verifyUnsubscribeToken(token: string): UnsubscribeTokenPayload | null {
        if (!this.unsubscribeSecret) {
            return null;
        }

        try {
            const decoded = 
                jwt.verify(token, this.unsubscribeSecret) as Partial<UnsubscribeTokenPayload>;

            if (
                decoded.type !== 'issue-notification-unsubscribe'
                || typeof decoded.issueId !== 'number'
                || typeof decoded.email !== 'string'
            ) {
                return null;
            }

            return {
                issueId: decoded.issueId,
                email: decoded.email,
                type: decoded.type
            };
        } catch {
            return null;
        }
    }

    public async sendIssueCreatedConfirmation(issue: IssueWithRelations) {
        if (!this.shouldNotify(issue)) {
            return;
        }

        await this.emailClient.send({
            to: issue.reporterEmail,
            subject: 'Trail issue report received',
            text: this.buildCreatedEmailText(issue),
            html: this.buildCreatedEmailHtml(issue),
        });
    }

    // Notify the park's contact address (if configured) that a new issue was
    // reported. Independent of the reporter's notification preference.
    public async sendNewIssueParkNotification(issue: IssueWithRelations) {
        const parkEmail = issue.park?.email;
        if (!parkEmail) {
            return;
        }

        await this.emailClient.send({
            to: parkEmail,
            subject: `New trail issue reported at ${issue.park?.name ?? 'a park'}`,
            text: this.buildParkNotificationText(issue),
            html: this.buildParkNotificationHtml(issue),
        });
    }

    public async sendIssueInProgressUpdate(issue: IssueWithRelations) {
        if (!this.shouldNotify(issue)) {
            return;
        }

        await this.emailClient.send({
            to: issue.reporterEmail,
            subject: 'Your trail issue is in progress',
            text: this.buildStatusUpdateEmailText(issue, 'in progress'),
            html: this.buildStatusUpdateEmailHtml(issue, 'in progress'),
        });
    }

    public async sendIssueResolvedUpdate(issue: IssueWithRelations) {
        if (!this.shouldNotify(issue)) {
            return;
        }

        await this.emailClient.send({
            to: issue.reporterEmail,
            subject: 'Your trail issue has been resolved',
            text: this.buildStatusUpdateEmailText(issue, 'resolved'),
            html: this.buildStatusUpdateEmailHtml(issue, 'resolved'),
        });
    }

    private shouldNotify(issue: Pick<IssueWithRelations, 'notifyReporter' | 'reporterEmail'>) {
        return Boolean(issue.notifyReporter && issue.reporterEmail);
    }

    private buildIssueSummary(issue: IssueWithRelations) {
        const parkName = issue.park?.name ?? 'Unknown park';

        return [
            `Park: ${parkName}`,
            `Type: ${issue.issueType}`,
            `Safety Risk: ${issue.safetyRisk}`,
            issue.description ? `Description: ${issue.description}` : undefined
        ].filter(Boolean).join('\n');
    }

    private buildIssueSummaryHtml(issue: IssueWithRelations) {
        const parkName = this.escapeHtml(issue.park?.name ?? 'Unknown park');
        const issueType = this.escapeHtml(issue.issueType);
        const safetyRisk = this.escapeHtml(issue.safetyRisk);
        const description = issue.description
            ? `<li><strong>Description:</strong> ${this.escapeHtml(issue.description)}</li>`
            : '';

        return [
            '<ul>',
            `<li><strong>Park:</strong> ${parkName}</li>`,
            `<li><strong>Type:</strong> ${issueType}</li>`,
            `<li><strong>Safety Risk:</strong> ${safetyRisk}</li>`,
            description,
            '</ul>'
        ].join('');
    }

    private buildCreatedEmailText(issue: IssueWithRelations) {
        return [
            'Thanks for reporting a trail issue.',
            '',
            'We received your report:',
            this.buildIssueSummary(issue),
            '',
            `Track or edit your report here: ${this.buildIssueCardUrl(issue.issueId)}`,
            '',
            `If you no longer want updates for this issue, unsubscribe here: ${this.buildUnsubscribeUrl(issue.issueId, issue.reporterEmail)}`,
            '',
            'You will receive additional updates as the issue status changes.'
        ].join('\n');
    }

    private buildCreatedEmailHtml(issue: IssueWithRelations) {
        return [
            '<p>Thanks for reporting a trail issue.</p>',
            '<p>We received your report:</p>',
            this.buildIssueSummaryHtml(issue),
            `<p><a href="${this.escapeHtml(this.buildIssueCardUrl(issue.issueId))}">Track or edit your report</a></p>`,
            `<p>If you no longer want updates for this issue, <a href="${this.escapeHtml(this.buildUnsubscribeUrl(issue.issueId, issue.reporterEmail))}">unsubscribe here</a>.</p>`,
            '<p>You will receive additional updates as the issue status changes.</p>'
        ].join('');
    }

    private buildParkNotificationText(issue: IssueWithRelations) {
        return [
            'A new trail issue has been reported.',
            '',
            this.buildIssueSummary(issue),
            '',
            `View the issue here: ${this.buildIssueCardUrl(issue.issueId)}`
        ].join('\n');
    }

    private buildParkNotificationHtml(issue: IssueWithRelations) {
        return [
            '<p>A new trail issue has been reported.</p>',
            this.buildIssueSummaryHtml(issue),
            `<p><a href="${this.escapeHtml(this.buildIssueCardUrl(issue.issueId))}">View the issue</a></p>`
        ].join('');
    }

    private buildStatusUpdateEmailText(issue: IssueWithRelations, statusLabel: 'in progress' | 'resolved' ) {
        return [
            `Your reported issue is now ${statusLabel}.`,
            '',
            this.buildIssueSummary(issue),
            '',
            `Track or edit your report here: ${this.buildIssueCardUrl(issue.issueId)}`,
            '',
            `If you no longer want updates for this issue, unsubscribe here: ${this.buildUnsubscribeUrl(issue.issueId, issue.reporterEmail)}`
        ].join('\n');
    }

    private buildStatusUpdateEmailHtml(issue: IssueWithRelations, statusLabel: 'in progress' | 'resolved' ) {
        return [
            `<p>Your reported issue is now ${this.escapeHtml(statusLabel)}.</p>`,
            this.buildIssueSummaryHtml(issue),
            `<p><a href="${this.escapeHtml(this.buildIssueCardUrl(issue.issueId))}">Track or edit your report</a></p>`,
            `<p>If you no longer want updates for this issue, <a href="${this.escapeHtml(this.buildUnsubscribeUrl(issue.issueId, issue.reporterEmail))}">unsubscribe here</a>.</p>`
        ].join('');
    }

    private buildIssueCardUrl(issueId: number) {
        return `${this.clientBaseUrl}/issues/card/${issueId}`;
    }

    private buildUnsubscribeUrl(issueId: number, email: string) {
        const token = this.createUnsubscribeToken(issueId, email);

        if (!token) {
            return `${this.serverBaseUrl}/api/issues/${issueId}/unsubscribe`;
        }

        return `${this.serverBaseUrl}/api/issues/${issueId}/unsubscribe?token=${encodeURIComponent(token)}`;
    }

    private escapeHtml(value: string) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
