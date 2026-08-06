// src/components/parks/ParkCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
    Issue, IssueStatusEnum, Park
} from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface ParkCardProps {
    park: Park;
    allIssues?: Issue[];
}

export const ParkCard: React.FC<ParkCardProps> = ({ park, allIssues }) => {
    const isError = !allIssues;

    // Default counts to 0 if there's an error/no issues
    const unresolvedIssuesCount = isError ? 0 : allIssues.filter((issue) => issue.status === IssueStatusEnum.UNRESOLVED).length;
    const inprocessIssuesCount = isError ? 0 : allIssues.filter((issue) => issue.status === IssueStatusEnum.IN_PROGRESS).length;

    return (
        <Link to={`/parks/${park.parkId}`} className="block hover:no-underline">
            <Card
                className="h-full transition-shadow hover:shadow-lg"
                footer={!isError && (
                    <div className="flex flex-col items-start gap-1 text-sm text-gray-600 border-t border-gray-100">
                        <div className="whitespace-nowrap">Unresolved: {unresolvedIssuesCount}</div>
                        <div className="whitespace-nowrap">In Progress: {inprocessIssuesCount}</div>
                    </div>
                )}
            >
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{park.name}</h3>
                    <div className="flex items-center gap-2">
                        {!park.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                        )}
                    </div>
                </div>

                <p className="text-sm text-gray-500">
                    {park.county} County<br />
                    {park.email}
                </p>
            </Card>
        </Link>
    );
};
