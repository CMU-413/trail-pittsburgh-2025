// src/pages/parks/ParkDetailPage.tsx
import React, { useState, useEffect } from 'react';
import {
    Link, useParams, useNavigate,
    useLocation
} from 'react-router-dom';
import {
    Park, Issue, IssueStatusEnum
} from '../../types';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/layout/LoadingSpinner';
import { EmptyState } from '../../components/layout/EmptyState';
import { IssueList } from '../../components/issues/IssueList';
import {
    parkApi, issueApi
} from '../../services/api';
import { Select } from '../../components/ui/Select';

export const ParkDetailPage: React.FC = () => {
    const { parkId } = useParams<{ parkId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [park, setPark] = useState<Park | null>(null);
    const [issues, setIssues] = useState<Issue[]>([]);
    const [statusCounts, setStatusCounts] = useState<Record<IssueStatusEnum, number>>({
        [IssueStatusEnum.UNRESOLVED]: 0,
        [IssueStatusEnum.IN_PROGRESS]: 0,
        [IssueStatusEnum.RESOLVED]: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [statuses, setStatuses] = useState<IssueStatusEnum[]>([
        IssueStatusEnum.UNRESOLVED,
        IssueStatusEnum.IN_PROGRESS,
    ]);

    const [showAllIssues, setShowAllIssues] = useState(false);

    const [datePreset, setDatePreset] = useState<'7d' | '30d' | '3m' | '6m' | 'all'>('6m');

    const getDateRange = () => {
        const now = new Date();

        if (datePreset === 'all') 
        {return {};}

        const start = new Date();

        if (datePreset === '7d') 
        {start.setDate(now.getDate() - 7);}
        if (datePreset === '30d') 
        {start.setDate(now.getDate() - 30);}
        if (datePreset === '3m') 
        {start.setMonth(now.getMonth() - 3);}
        if (datePreset === '6m') 
        {start.setMonth(now.getMonth() - 6);}

        return {
            startDate: start.toISOString(),
            endDate: now.toISOString(),
        };
    };

    useEffect(() => {
        const fetchParkData = async () => {
            if (!parkId) {
                setError('Invalid park ID');
                setIsLoading(false);
                return;
            }
            
            try {
                const id = parseInt(parkId, 10);
                
                // Fetch park details
                const parkData = await parkApi.getPark(id);
                
                if (!parkData) {
                    setError('Park not found');
                    setIsLoading(false);
                    return;
                }
                
                setPark(parkData);

                const { startDate, endDate } = getDateRange();
                const allStatuses = Object.values(IssueStatusEnum);

                const allIssuesForCounts = await issueApi.getIssuesByPark(id, allStatuses, startDate, endDate);
                setStatusCounts(
                    allIssuesForCounts.reduce((counts, issue) => {
                        counts[issue.status] = (counts[issue.status] ?? 0) + 1;
                        return counts;
                    }, {
                        [IssueStatusEnum.UNRESOLVED]: 0,
                        [IssueStatusEnum.IN_PROGRESS]: 0,
                        [IssueStatusEnum.RESOLVED]: 0,
                    } as Record<IssueStatusEnum, number>)
                );

                // Fetch issues for this park
                const issuesData = await issueApi.getIssuesByPark(id, statuses, startDate, endDate);
                setIssues(issuesData);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Error fetching park details:', err);
                setError('Failed to load park details. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchParkData();
    }, [parkId, statuses, datePreset, location.key]);

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error || !park) {
        return (
            <div>
                <PageHeader title="Park Details" />
                <EmptyState
                    title={error || 'Park not found'}
                    description="The park you're looking for doesn't exist or couldn't be loaded."
                    action={
                        <Button variant="primary" onClick={() => navigate('/parks')}>
                            Back to Parks
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4">
                <Link 
                    to="/parks" 
                    className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <span className="mr-1" aria-hidden="true">&larr;</span>
                    Back to Dashboard
                </Link>
            </div>
            <PageHeader
                title={park.name}
                subtitle={`${park.county} County${park.email ? ` · ${park.email}` : ''}`}
                action={
                    <div className="flex space-x-3">
                        <Link to={`/parks/${park.parkId}/edit`}>
                            <Button variant="secondary">Edit Park</Button>
                        </Link>
                    </div>
                }
            />

            <div>
			    <div className="flex flex-wrap gap-4 items-center mb-4">
                    {/* Status filter */}
                    <div className="flex gap-2">
                        {Object.values(IssueStatusEnum).map((status) => (
                            <Button
                                key={status}
                                variant={statuses.includes(status) ? 'primary' : 'secondary'}
  							size="sm"
                                onClick={() => {
                                    setStatuses((prev) =>
                                        prev.includes(status)
                                            ? prev.filter((s) => s !== status)
                                            : [...prev, status]);
                                }}
                                className="rounded-full"
                            >
                                {`${status.replace('_', ' ')} (${statusCounts[status as IssueStatusEnum] ?? 0})`}
                            </Button>
                        ))}
                    </div>

                    {/* Date filter */}
                    <div className="w-40">
                        <Select
                            name="datePreset"
                            value={datePreset}
                            onChange={(value) => setDatePreset(value as '7d' | '30d' | '3m' | '6m' | 'all')}
                            options={[
                                { value: '7d', label: 'Last 7 days' },
                                { value: '30d', label: 'Last 30 days' },
                                { value: '3m', label: 'Last 3 months' },
                                { value: '6m', label: 'Last 6 months' },
                                { value: 'all', label: 'All time' },
                            ]}
                            sortOptions={false}
                        />
                    </div>
                </div>

                <IssueList
                    issues={showAllIssues ? issues : issues.slice(0, 6)}
                    showLocation={false}
                    emptyStateMessage="No issues found"
                />
                
                {issues.length > 6 && !showAllIssues && (
                    <div className="mt-6 text-center">
                        <Button variant="secondary" onClick={() => setShowAllIssues(true)}>
                            View All Issues
                        </Button>
                    </div>
                )}

                {issues.length > 6 && showAllIssues && (
                    <div className="mt-6 text-center">
                        <Button variant="secondary" onClick={() => setShowAllIssues(false)}>
                            Show Less
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
